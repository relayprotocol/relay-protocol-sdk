import { AbiCoder, getBytes, verifyMessage } from "ethers";

import { EvmCommitmentValidator } from "./vm/evm";
import { SvmCommitmentValidator } from "./vm/svm";

import { ChainConfig, Side, Status } from "./types";
import { ChainVmType, Commitment, getCommitmentHash } from "../commitment";

const BPS_UNIT = 1000000000000000000n;

type Result = { status: Status; details?: any };

type Amount = {
  committed: bigint;
  actual: bigint;
};

enum ErrorReason {
  UNSUPPORTED_CHAIN = "UNSUPPORTED_CHAIN",
  MISSING_INPUTS = "MISSING_INPUTS",
  MISSING_REFUNDS = "MISSING_REFUNDS",
  INVALID_CALLS_ENCODING = "INVALID_CALLS_ENCODING",
  INVALID_SIGNATURE = "INVALID_SIGNATURE",

  MISSING_USER_PAYMENT = "MISSING_USER_PAYMENT",
  NON_UNIQUE_USER_PAYMENTS = "NON_UNIQUE_USER_PAYMENTS",

  INSUFFICIENT_OUTPUT_PAYMENT_AMOUNT = "INSUFFICIENT_OUTPUT_PAYMENT_AMOUNT",
  INSUFFICIENT_REFUND_PAYMENT_AMOUNT = "INSUFFICIENT_REFUND_PAYMENT_AMOUNT",
  MISSING_REFUND_EXECUTION = "MISSING_REFUND_EXECUTION",
}

export class Validator {
  public chainConfigs: Record<string, ChainConfig>;

  constructor(chainConfigs: Record<string, ChainConfig>) {
    this.chainConfigs = chainConfigs;
  }

  public async validateCommitmentData(
    commitment: Commitment,
    signature: string
  ): Promise<Result> {
    // Ensure we have at least one input
    if (!commitment.inputs.length) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.MISSING_INPUTS,
          side: Side.INPUT,
          commitment,
          chainConfigs: this.chainConfigs,
        },
      };
    }

    // Ensure every input has at least one refund
    for (const input of commitment.inputs) {
      if (!input.refunds.length) {
        return {
          status: Status.FAILURE,
          details: {
            reason: ErrorReason.MISSING_REFUNDS,
            side: Side.INPUT,
            commitment,
            input,
            chainConfigs: this.chainConfigs,
          },
        };
      }

      // Validate the chain of every refund
      for (const refund of input.refunds) {
        const chain = this.chainConfigs[refund.chain];
        if (!chain) {
          return {
            status: Status.FAILURE,
            details: {
              reason: ErrorReason.UNSUPPORTED_CHAIN,
              side: Side.REFUND,
              commitment,
              chainConfigs: this.chainConfigs,
            },
          };
        }
      }
    }

    // Validate the chain of the output
    const chain = this.chainConfigs[commitment.output.chain];
    if (!chain) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.UNSUPPORTED_CHAIN,
          side: Side.OUTPUT,
          commitment,
          chainConfigs: this.chainConfigs,
        },
      };
    }

    // Validate the encoding of the calls
    commitment.output.calls.forEach((call) => {
      // At the moment, only EVM calls are supported
      try {
        const result = AbiCoder.defaultAbiCoder().decode(
          ["(address from, address to, bytes data, uint256 value) call"],
          call
        );

        ({
          from: result.call.from.toLowerCase(),
          to: result.call.to.toLowerCase(),
          data: result.call.data,
          value: result.call.value.toString(),
        });
      } catch {
        return {
          status: Status.FAILURE,
          details: {
            reason: ErrorReason.INVALID_CALLS_ENCODING,
            side: Side.OUTPUT,
            commitment,
            call,
          },
        };
      }
    });

    // Validate the commitment signature
    const signer = verifyMessage(
      getBytes(getCommitmentHash(commitment)),
      signature
    );
    if (signer.toLowerCase() !== commitment.solver.toLowerCase()) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.UNSUPPORTED_CHAIN,
          commitment,
          signature,
          chainConfigs: this.chainConfigs,
        },
      };
    }

    return { status: Status.SUCCESS };
  }

  public async validateCommitmentOutputExecution(data: {
    // The relevant commitment
    commitment: Commitment;
    // The output execution data
    execution: {
      transactionId: string;
    };
    // The actual user payments, corresponding to the input payments specified by the commitment
    userPayments: {
      inputIndex: number;
      amount: string;
    }[];
  }): Promise<Result> {
    const { commitment, execution, userPayments } = data;

    // Verify the user payments
    {
      const result = this.verifyUserPayments({ commitment, userPayments });
      if (result.status !== Status.SUCCESS) {
        return result;
      }
    }

    // Validate the output and get the output amount (committed and actual)
    let outputAmount: Amount;
    {
      const output = commitment.output;

      const validationResult = await this.getCommitmentValidator(
        this.chainConfigs[output.chain].vmType
      ).validateOutput({
        chainConfigs: this.chainConfigs,
        commitment,
        transactionId: execution.transactionId,
      });
      if (validationResult.status !== Status.SUCCESS) {
        return validationResult;
      }

      outputAmount = {
        committed: BigInt(output.payment.minimumAmount),
        actual: validationResult.amount,
      };
    }

    // Get the input amount (committed and actual)
    const inputAmount: Amount = {
      committed: commitment.inputs
        .map((i) => BigInt(i.payment.amount) * BigInt(i.payment.weight))
        .reduce((a, b) => a + b),
      actual: userPayments
        .map(
          (p) =>
            BigInt(p.amount) *
            BigInt(commitment.inputs[p.inputIndex].payment.weight)
        )
        .reduce((a, b) => a + b),
    };

    // Determine whether there was any underpayment
    let underpaymentBps = 0n;
    if (inputAmount.actual < inputAmount.committed) {
      underpaymentBps =
        ((inputAmount.committed - inputAmount.actual) * BPS_UNIT) /
        inputAmount.committed;
    }

    // Determine the needed output amount based on the committed amount and any user underpayment
    const neededOutputAmount =
      (BigInt(outputAmount.committed) * (BPS_UNIT - underpaymentBps)) /
      BPS_UNIT;
    if (BigInt(outputAmount.actual) < neededOutputAmount) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.INSUFFICIENT_OUTPUT_PAYMENT_AMOUNT,
          side: Side.OUTPUT,
          commitment,
          chainConfigs: this.chainConfigs,
          inputAmountCommitted: inputAmount.committed.toString(),
          inputAmountActual: inputAmount.actual.toString(),
          outputAmountCommitted: outputAmount.committed.toString(),
          outputAmountActual: outputAmount.actual.toString(),
          outputAmountNeeded: neededOutputAmount.toString(),
          underpaymentBps: underpaymentBps.toString(),
        },
      };
    }

    return { status: Status.SUCCESS };
  }

  public async validateCommitmentRefundExecution(data: {
    // The relevant commitment
    commitment: Commitment;
    // The refund executions data
    executions: {
      inputIndex: number;
      refundIndex: number;
      transactionId: string;
    }[];
    // The actual user payments, corresponding to the input payments specified by the commitment
    userPayments: {
      inputIndex: number;
      amount: string;
    }[];
  }): Promise<Result> {
    const { commitment, executions, userPayments } = data;

    // Verify the user payments
    {
      const result = this.verifyUserPayments({ commitment, userPayments });
      if (result.status !== Status.SUCCESS) {
        return result;
      }
    }

    // Validate the refunds
    for (const { inputIndex, amount } of userPayments) {
      const input = commitment.inputs[inputIndex];

      const refund = executions.find((e) => e.inputIndex === inputIndex);
      if (!refund) {
        return {
          status: Status.FAILURE,
          details: {
            reason: ErrorReason.MISSING_REFUND_EXECUTION,
            side: Side.REFUND,
            commitment,
            inputIndex,
            chainConfigs: this.chainConfigs,
          },
        };
      }

      // Validate the refund and get the refund amount (committed and actual)
      const refundValidationResult = await this.getCommitmentValidator(
        this.chainConfigs[input.chain].vmType
      ).validateRefund({
        chainConfigs: this.chainConfigs,
        commitment,
        inputIndex: refund.inputIndex,
        refundIndex: refund.refundIndex,
        transactionId: refund.transactionId,
      });
      if (refundValidationResult.status !== Status.SUCCESS) {
        return refundValidationResult;
      }

      const refundAmount: Amount = {
        committed: BigInt(
          commitment.inputs[refund.inputIndex].refunds[refund.refundIndex]
            .minimumAmount
        ),
        actual: BigInt(refundValidationResult.amount),
      };

      // Get the input amount (committed and actual)
      const inputAmount: Amount = {
        committed: BigInt(input.payment.amount) * BigInt(input.payment.weight),
        actual: BigInt(amount) * BigInt(input.payment.weight),
      };

      // Determine whether there was any underpayment
      let underpaymentBps = 0n;
      if (inputAmount.actual < inputAmount.committed) {
        underpaymentBps =
          ((inputAmount.committed - inputAmount.actual) * BPS_UNIT) /
          inputAmount.committed;
      }

      // Determine the needed output amount based on the committed amount and any user underpayment
      const neededRefundAmount =
        (BigInt(refundAmount.committed) * (BPS_UNIT - underpaymentBps)) /
        BPS_UNIT;
      if (refundAmount.actual < neededRefundAmount) {
        return {
          status: Status.FAILURE,
          details: {
            reason: ErrorReason.INSUFFICIENT_REFUND_PAYMENT_AMOUNT,
            side: Side.REFUND,
            commitment,
            chainConfigs: this.chainConfigs,
            inputAmountCommitted: inputAmount.committed.toString(),
            inputAmountActual: inputAmount.actual.toString(),
            refundAmountCommitted: refundAmount.committed.toString(),
            refundAmountActual: refundAmount.actual.toString(),
            refundAmountNeeded: neededRefundAmount.toString(),
            underpaymentBps: underpaymentBps.toString(),
          },
        };
      }
    }

    return { status: Status.SUCCESS };
  }

  private verifyUserPayments(data: {
    // The relevant commitment
    commitment: Commitment;
    // The user payments, corresponding to the input payments specified by the commitment
    userPayments: {
      inputIndex: number;
      amount: string;
    }[];
  }) {
    const { commitment, userPayments } = data;

    // The user payments should point to unique commitment inputs
    if (
      userPayments.length !==
      new Set(userPayments.map((p) => p.inputIndex)).size
    ) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.NON_UNIQUE_USER_PAYMENTS,
          side: Side.INPUT,
          commitment,
          userPayments,
        },
      };
    }

    // Every commitment input payment should be pointed to by a user payment
    for (let i = 0; i < commitment.inputs.length; i++) {
      const userPayment = userPayments.find((p) => p.inputIndex === i);
      if (!userPayment) {
        return {
          status: Status.FAILURE,
          details: {
            reason: ErrorReason.MISSING_USER_PAYMENT,
            side: Side.INPUT,
            commitment,
            userPayments,
            missingInputPayment: commitment.inputs[i],
            chainConfigs: this.chainConfigs,
          },
        };
      }
    }

    return { status: Status.SUCCESS };
  }

  private getCommitmentValidator(chainVmType: ChainVmType) {
    switch (chainVmType) {
      case ChainVmType.EVM:
        return new EvmCommitmentValidator();

      case ChainVmType.SVM:
        return new SvmCommitmentValidator();
    }
  }
}
