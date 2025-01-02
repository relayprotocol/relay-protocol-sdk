// At the moment, chains and addresses are represented as plain strings, but we should decide on standard formats for these:
// - chains: we can either use a standard numeric id or a standard string to identify chains
// - addresses: depending on the chain of the address we should clarify normalization and encoding rules (eg. lowercase / uppercase / mixedcase)

import { ethers } from "ethers";

export enum ChainVmType {
  EVM = 0,
  SVM = 1,
}

export const COMMITMENT_ID_LENGTH_IN_BYTES = 32;

export type Commitment = {
  // The onchain identifier for the commitment, should be specified in the user's deposit transaction(s) and the solver's fill transaction
  id: string;

  // The EVM address of the solver given exclusive filling rights
  solver: string;

  // Random salt value to ensure commitment uniqueness
  salt: string;

  // A commitment can have multiple inputs, each specifying:
  inputs: {
    // - the chain of the input payment
    chain: string;
    // - the input payment details
    payment: {
      currency: string;
      amount: string;
      weight: string;
    };
    // - a list of refund options when the solver is unable to fulfill the request
    refunds: {
      chain: string;
      to: string;
      currency: string;
      minimumAmount: string;
    }[];
  }[];

  // A commitment can have a single output, specifying:
  output: {
    // - the chain of the output fill
    chain: string;
    // - the output payment details
    payment: {
      to: string;
      currency: string;
      minimumAmount: string;
      expectedAmount: string;
    };
    // - a list of calls to be executed (encoded based on the chain's vm type)
    calls: string[];
  };
};

export const getCommitmentHash = (commitment: Commitment) => {
  const types = {
    Commitment: [
      { name: "id", type: "bytes32" },
      { name: "solver", type: "address" },
      { name: "salt", type: "uint256" },
      { name: "inputs", type: "Input[]" },
      { name: "output", type: "Output" },
    ],
    Input: [
      { name: "chain", type: "string" },
      { name: "payment", type: "InputPayment" },
      { name: "refunds", type: "InputRefund[]" },
    ],
    InputPayment: [
      { name: "currency", type: "string" },
      { name: "amount", type: "uint256" },
      { name: "weight", type: "uint256" },
    ],
    InputRefund: [
      { name: "chain", type: "string" },
      { name: "to", type: "string" },
      { name: "currency", type: "string" },
      { name: "minimumAmount", type: "uint256" },
    ],
    Output: [
      { name: "chain", type: "string" },
      { name: "payment", type: "OutputPayment" },
      { name: "calls", type: "string[]" },
    ],
    OutputPayment: [
      { name: "to", type: "string" },
      { name: "currency", type: "string" },
      { name: "minimumAmount", type: "uint256" },
      { name: "expectedAmount", type: "uint256" },
    ],
  };

  return ethers.TypedDataEncoder.hashStruct("Commitment", types, commitment);
};
