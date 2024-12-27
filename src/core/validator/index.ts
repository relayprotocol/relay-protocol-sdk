import { AbiCoder, getBytes, verifyMessage } from "ethers";

import { EvmCommitmentValidator } from "./vm/evm";
import { SvmCommitmentValidator } from "./vm/svm";

import { ChainConfig, Side, Status } from "./types";
import { ChainVmType, Commitment, getCommitmentHash } from "../commitment";

const BPS_UNIT = 1000000000000000000n;

type Result = { status: Status; details?: any };

enum ErrorReason {
  UNSUPPORTED_CHAIN = "UNSUPPORTED_CHAIN",
  MISSING_REFUND_OPTIONS = "MISSING_REFUND_OPTIONS",
  MISSING_REFUND_EXECUTION = "MISSING_REFUND_EXECUTION",
  INVALID_CALLS_ENCODING = "INVALID_CALLS_ENCODING",
  INVALID_SIGNATURE = "INVALID_SIGNATURE",
  INSUFFICIENT_OUTPUT_PAYMENT_AMOUNT = "INSUFFICIENT_OUTPUT_PAYMENT_AMOUNT",
  INSUFFICIENT_REFUND_PAYMENT_AMOUNT = "INSUFFICIENT_REFUND_PAYMENT_AMOUNT",
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
    // Validate each input
    for (const input of commitment.inputs) {
      // Validate the input chain
      const chain = this.chainConfigs[input.chain];
      if (!chain) {
        return {
          status: Status.FAILURE,
          details: {
            reason: ErrorReason.UNSUPPORTED_CHAIN,
            side: Side.INPUT,
            commitment,
            input,
            chainConfigs: this.chainConfigs,
          },
        };
      }

      // Validate the input refunds
      if (!input.refunds.length) {
        return {
          status: Status.FAILURE,
          details: {
            reason: ErrorReason.MISSING_REFUND_OPTIONS,
            side: Side.INPUT,
            commitment,
            input,
            chainConfigs: this.chainConfigs,
          },
        };
      }
    }

    // Validate the output chain
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
      try {
        const result = AbiCoder.defaultAbiCoder().decode(
          ["(address from, address to, bytes data, uint256 value)"],
          call
        );

        return {
          from: result.from.toLowerCase(),
          to: result.to.toLowerCase(),
          data: result.data,
          value: result.value.toString(),
        };
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

  public async validateCommitmentOutputExecution(
    commitment: Commitment,
    inputExecutions: {
      inputIndex: number;
      transactionId: string;
    }[],
    outputExecution: {
      transactionId: string;
    }
  ): Promise<Result> {
    // Validate the inputs
    const inputAmounts: {
      committed: bigint;
      actual: bigint;
      weight: bigint;
    }[] = [];
    for (const { inputIndex, transactionId } of inputExecutions) {
      const input = commitment.inputs[inputIndex];

      const validationResult = await this.getCommitmentValidator(
        this.chainConfigs[input.chain].vmType
      ).validateInput({
        chainConfigs: this.chainConfigs,
        commitment,
        inputIndex,
        transactionId,
      });
      if (validationResult.status !== Status.SUCCESS) {
        return validationResult;
      }

      inputAmounts.push({
        committed: BigInt(input.payment.amount),
        actual: validationResult.amount,
        weight: BigInt(input.payment.weight),
      });
    }

    // Validate the output
    let outputAmount: {
      committed: bigint;
      actual: bigint;
    };
    {
      const output = commitment.output;

      const validationResult = await this.getCommitmentValidator(
        this.chainConfigs[output.chain].vmType
      ).validateOutput({
        chainConfigs: this.chainConfigs,
        commitment,
        transactionId: outputExecution.transactionId,
      });
      if (validationResult.status !== Status.SUCCESS) {
        return validationResult;
      }

      outputAmount = {
        committed: BigInt(output.payment.minimumAmount),
        actual: validationResult.amount,
      };
    }

    // Get the total weighted committed and actual amounts
    const totalCommittedAmount = inputAmounts.reduce(
      (total, { committed, weight }) => total + committed * weight,
      0n
    );
    const totalActualAmount = inputAmounts.reduce(
      (total, { actual, weight }) => total + actual * weight,
      0n
    );

    let underpaymentBps = 0n;
    if (totalActualAmount < totalCommittedAmount) {
      underpaymentBps =
        ((totalCommittedAmount - totalActualAmount) * BPS_UNIT) /
        totalCommittedAmount;
    }

    const totalOutputNeededAmount =
      (BigInt(outputAmount.committed) * (BPS_UNIT - underpaymentBps)) /
      BPS_UNIT;
    if (BigInt(outputAmount.actual) < totalOutputNeededAmount) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.INSUFFICIENT_OUTPUT_PAYMENT_AMOUNT,
          commitment,
          chainConfigs: this.chainConfigs,
          totalInputCommittedAmount: totalCommittedAmount.toString(),
          totalInputActualAmount: totalActualAmount.toString(),
          totalOutputCommittedAmount: outputAmount.committed.toString(),
          totalOutputActualAmount: outputAmount.actual.toString(),
          totalOutputNeededAmount: totalOutputNeededAmount.toString(),
          underpaymentBps: underpaymentBps.toString(),
        },
      };
    }

    return { status: Status.SUCCESS };
  }

  public async validateCommitmentRefundExecution(
    commitment: Commitment,
    inputExecutions: {
      inputIndex: number;
      transactionId: string;
    }[],
    refundExecutions: {
      inputIndex: number;
      refundIndex: number;
      transactionId: string;
    }[]
  ): Promise<Result> {
    // Validate the inputs and refunds
    for (const { inputIndex, transactionId } of inputExecutions) {
      const input = commitment.inputs[inputIndex];

      const refund = refundExecutions.find((e) => e.inputIndex === inputIndex);
      if (!refund) {
        return {
          status: Status.FAILURE,
          details: {
            reason: ErrorReason.MISSING_REFUND_EXECUTION,
            commitment,
            inputIndex,
            chainConfigs: this.chainConfigs,
          },
        };
      }

      // Validate input
      const inputValidationResult = await this.getCommitmentValidator(
        this.chainConfigs[input.chain].vmType
      ).validateInput({
        chainConfigs: this.chainConfigs,
        commitment,
        inputIndex,
        transactionId,
      });
      if (inputValidationResult.status !== Status.SUCCESS) {
        return inputValidationResult;
      }

      // Validate refund
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

      // Get the total weighted committed and actual amounts
      const committedAmount =
        BigInt(input.payment.amount) * BigInt(input.payment.weight);
      const actualAmount =
        inputValidationResult.amount * BigInt(input.payment.weight);

      let underpaymentBps = 0n;
      if (actualAmount < committedAmount) {
        underpaymentBps =
          ((committedAmount - actualAmount) * BPS_UNIT) / committedAmount;
      }

      const refundNeededAmount =
        (BigInt(
          commitment.inputs[refund.inputIndex].refunds[refund.refundIndex]
            .minimumAmount
        ) *
          (BPS_UNIT - underpaymentBps)) /
        BPS_UNIT;
      if (refundValidationResult.amount < refundNeededAmount) {
        return {
          status: Status.FAILURE,
          details: {
            reason: ErrorReason.INSUFFICIENT_REFUND_PAYMENT_AMOUNT,
            commitment,
            chainConfigs: this.chainConfigs,
            inputCommittedAmount: committedAmount.toString(),
            inputActualAmount: actualAmount.toString(),
            refundCommittedAmount:
              commitment.inputs[refund.inputIndex].refunds[refund.refundIndex]
                .minimumAmount,
            refundActualAmount: refundValidationResult.amount.toString(),
            refundNeededAmount: refundNeededAmount.toString(),
            underpaymentBps: underpaymentBps.toString(),
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
