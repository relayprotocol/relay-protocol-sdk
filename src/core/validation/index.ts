import { getBytes, verifyMessage } from "ethers";

import { chains, ChainVmType } from "../chains";
import { Commitment, getCommitmentId } from "../commitment";

import { EvmCommitmentValidator } from "./vm/evm";

const getCommitmentValidator = (chainVmType: ChainVmType) => {
  switch (chainVmType) {
    case ChainVmType.Evm:
      return new EvmCommitmentValidator();

    case ChainVmType.Svm:
      throw new Error("SVM commitment validator not implemented");
  }
};

export type ValidateCommitmentDataResult =
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

export type ValidateCommitmentExecutionResult =
  | { status: "success" }
  | { status: "failure"; reason: string };

export const validateCommitmentExecution = async (
  commitment: Commitment,
  signature: string,
  inputExecutions: {
    inputIndex: number;
    transactionId: string;
  }[],
  outputExecution: {
    transactionId: string;
  }
): Promise<ValidateCommitmentExecutionResult> => {
  // First, validate the commitment data
  const validateCommitmentDataResult = await validateCommitmentData(
    commitment,
    signature
  );
  if (validateCommitmentDataResult.status !== "success") {
    return validateCommitmentDataResult;
  }

  // Validate the inputs
  for (const { inputIndex, transactionId } of inputExecutions) {
    const input = commitment.inputs[inputIndex];

    const parseInputResult = await getCommitmentValidator(
      chains[input.chain].vmType
    ).parseInput({
      commitment,
      inputIndex,
      transactionId,
    });
    if (parseInputResult.status !== "success") {
      return parseInputResult;
    }

    if (BigInt(parseInputResult.amountPaid) < BigInt(input.payment.amount)) {
      return {
        status: "failure",
        reason: "Insufficient input payment",
      };
    }
  }

  // Validate the output
  {
    const output = commitment.output;

    const parseOutputResult = await getCommitmentValidator(
      chains[output.chain].vmType
    ).parseOutput({
      commitment,
      transactionId: outputExecution.transactionId,
    });
    if (parseOutputResult.status !== "success") {
      return parseOutputResult;
    }

    if (
      BigInt(parseOutputResult.amountPaid) < BigInt(output.payment.minAmount)
    ) {
      return {
        status: "failure",
        reason: "Insufficient output payment",
      };
    }

    if (!parseOutputResult.callsExecuted) {
      return {
        status: "failure",
        reason: "Output calls not executed",
      };
    }
  }

  return { status: "success" };
};
