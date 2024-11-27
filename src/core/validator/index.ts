import { getBytes, verifyMessage } from "ethers";

import { EvmCommitmentValidator } from "./vm/evm";
import { SvmCommitmentValidator } from "./vm/svm";

import { ChainConfig, Side, Status } from "./types";
import { ChainVmType, Commitment, getCommitmentId } from "../commitment";

const BPS_UNIT = 1000000000000000000n;

type Result = { status: Status } | { status: Status; details: any };

enum ErrorReason {
  UNSUPPORTED_CHAIN = "UNSUPPORTED_CHAIN",
  MISSING_REFUND_OPTIONS = "MISSING_REFUND_OPTIONS",
  INVALID_SIGNATURE = "INVALID_SIGNATURE",
  INSUFFICIENT_OUTPUT_PAYMENT_AMOUNT = "INSUFFICIENT_OUTPUT_PAYMENT_AMOUNT",
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

    // Validate the commitment signature
    const signer = verifyMessage(
      getBytes(getCommitmentId(commitment)),
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

  public async validateCommitmentSuccessExecution(
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

    if (
      BigInt(outputAmount.actual) <
      (BigInt(outputAmount.committed) * (BPS_UNIT - underpaymentBps)) / BPS_UNIT
    ) {
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
          underpaymentBps: underpaymentBps.toString(),
        },
      };
    }

    return { status: Status.SUCCESS };
  }

  private getCommitmentValidator(chainVmType: ChainVmType) {
    switch (chainVmType) {
      case ChainVmType.EVM:
        return new EvmCommitmentValidator();

      case ChainVmType.SVM:
        throw new SvmCommitmentValidator();

      case ChainVmType.BVM:
        throw new Error("BVM commitment validator not implemented");
    }
  }
}
