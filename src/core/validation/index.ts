import { getBytes, verifyMessage } from "ethers";

import { chains } from "../chains";
import { Commitment, getCommitmentId } from "../commitment";

export type ParseInputResult =
  | { status: "success"; amountPaid: string }
  | { status: "failure"; reason: string };

export type ParseOutputResult =
  | { status: "success"; amountPaid: string; callsExecuted: boolean }
  | { status: "failure"; reason: string };

export type ValidateCommitmentDataResult =
  | { status: "success" }
  | { status: "failure"; reason: string };

export type ValidateCommitmentExecutionResult =
  | { status: "success" }
  | { status: "failure"; reason: string };

export const validateCommitmentData = async (
  commitment: Commitment,
  signature: string
): Promise<ValidateCommitmentDataResult> => {
  // Validate the number of inputs
  if (commitment.inputs.length !== 1) {
    return {
      status: "failure",
      reason: "Invalid number of inputs",
    };
  }

  // Validate each input
  for (const input of commitment.inputs) {
    // Validate the input chain
    const chain = chains[input.chain];
    if (!chain) {
      return {
        status: "failure",
        reason: "Unsupported input chain",
      };
    }

    // Validate the input refunds
    if (!input.refund.length) {
      return {
        status: "failure",
        reason: "Missing refund options",
      };
    }
  }

  // Validate the output chain
  const chain = chains[commitment.output.chain];
  if (!chain) {
    return {
      status: "failure",
      reason: "Unsupported output chain",
    };
  }

  // Validate the commitment signature
  const signer = verifyMessage(
    getBytes(getCommitmentId(commitment)),
    signature
  );
  if (signer.toLowerCase() !== commitment.solver.toLowerCase()) {
    return {
      status: "failure",
      reason: "Invalid signature",
    };
  }

  return { status: "success" };
};

export abstract class CommitmentValidator {
  public abstract parseInput(data: {
    commitment: Commitment;
    inputIndex: number;
    transactionId: string;
  }): Promise<ParseInputResult>;

  public abstract parseOutput(data: {
    commitment: Commitment;
    transactionId: string;
  }): Promise<ParseOutputResult>;

  public async validateCommitmentExecution({
    commitment,
    signature,
    inputs,
    output,
  }: {
    commitment: Commitment;
    signature: string;
    inputs: {
      inputIndex: number;
      transactionId: string;
    }[];
    output: {
      transactionId: string;
    };
  }): Promise<ValidateCommitmentExecutionResult> {
    // First, validate the commitment data
    const validateCommitmentDataResult = await validateCommitmentData(
      commitment,
      signature
    );
    if (validateCommitmentDataResult.status !== "success") {
      return validateCommitmentDataResult;
    }

    // Validate the inputs
    for (const { inputIndex, transactionId } of inputs) {
      const parseInputResult = await this.parseInput({
        commitment,
        inputIndex,
        transactionId,
      });
      if (parseInputResult.status !== "success") {
        return parseInputResult;
      }

      if (
        BigInt(parseInputResult.amountPaid) <
        BigInt(commitment.inputs[inputIndex].payment.amount)
      ) {
        return {
          status: "failure",
          reason: "Insufficient input payment",
        };
      }
    }

    // Validate the output
    {
      const parseOutputResult = await this.parseOutput({
        commitment,
        transactionId: output.transactionId,
      });
      if (parseOutputResult.status !== "success") {
        return parseOutputResult;
      }

      if (
        BigInt(parseOutputResult.amountPaid) <
        BigInt(commitment.output.payment.minAmount)
      ) {
        return {
          status: "failure",
          reason: "Insufficient output payment",
        };
      }
    }

    return { status: "success" };
  }
}
