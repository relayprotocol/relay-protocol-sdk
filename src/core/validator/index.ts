import { getBytes, verifyMessage } from "ethers";

import { ChainConfig, Status } from "./types";
import { CommonFailureReason } from "./vm/common";
import { EvmCommitmentValidator } from "./vm/evm";
import { ChainVmType, Commitment, getCommitmentId } from "../commitment";

const BPS_UNIT = 1000000000000000000n;

type Result =
  | { status: Status }
  | { status: Status; reason: CommonFailureReason };

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
          reason: CommonFailureReason.UNSUPPORTED_CHAIN,
        };
      }

      // Validate the input refunds
      if (!input.refunds.length) {
        return {
          status: Status.FAILURE,
          reason: CommonFailureReason.MISSING_REFUND_OPTIONS,
        };
      }
    }

    // Validate the output chain
    const chain = this.chainConfigs[commitment.output.chain];
    if (!chain) {
      return {
        status: Status.FAILURE,
        reason: CommonFailureReason.UNSUPPORTED_CHAIN,
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
        reason: CommonFailureReason.INVALID_SIGNATURE,
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
        committed: input.payment.amount,
        actual: validationResult.amount,
        weight: input.payment.weight,
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
        committed: output.payment.minimumAmount,
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
        reason: CommonFailureReason.INSUFFICIENT_OUTPUT_AMOUNT,
      };
    }

    return { status: Status.SUCCESS };
  }

  private getCommitmentValidator(chainVmType: ChainVmType) {
    switch (chainVmType) {
      case ChainVmType.EVM:
        return new EvmCommitmentValidator();

      case ChainVmType.SVM:
        throw new Error("SVM commitment validator not implemented");

      case ChainVmType.BVM:
        throw new Error("BVM commitment validator not implemented");
    }
  }
}
