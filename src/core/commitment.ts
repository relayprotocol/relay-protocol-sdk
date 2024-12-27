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
  // The onchain identifier for the commitment, MUST be specified in the user's deposit transaction(s) and the solver's fill transaction
  // This value MUST be unique amongst all the commitments signed by any given solver
  id: string /* solidity type: bytes32 */;

  // The EVM address of the solver which will insure the request
  solver: string /* solidity type: address */;

  // The bond / insurance amount for this commitment (denominated in the currency the solver holds in escrow)
  bond: string /* solidity type: uint256 */;

  // Random salt value to ensure commitment uniqueness (not strictly needed since the above id also guarantees uniqueness)
  salt: string /* solidity type: uint256 */;

  // Deadline for the user to execute all input payments
  deadline: number /* solidity type: uint32 */;

  // A commitment can have multiple inputs, each specifying:
  inputs: {
    // - the chain of the input payment
    chain: string /* solidity type: string */;
    // - the input payment details
    payment: {
      to: string /* solidity type: string */;
      currency: string /* solidity type: string */;
      amount: string /* solidity type: uint256 */;
      weight: string /* solidity type: uint256 */;
    };
    // - a list of refund options for when the payment was sent but the solver is unable to fulfill the request
    refunds: {
      chain: string /* solidity type: string */;
      to: string /* solidity type: string */;
      currency: string /* solidity type: string */;
      minimumAmount: string /* solidity type: uint256 */;
    }[];
  }[];

  // A commitment can have a single output, specifying:
  output: {
    // - the chain of the output fill
    chain: string /* solidity type: string */;
    // - the output payment details
    payment: {
      to: string /* solidity type: string */;
      currency: string /* solidity type: string */;
      minimumAmount: string /* solidity type: uint256 */;
      expectedAmount: string /* solidity type: uint256 */;
    };
    // - a list of calls to be executed
    calls: string[] /* solidity type: string[] */;
  };

  // Extra data associated to the commitment
  extraData: string;
};

export const getCommitmentHash = (commitment: Commitment) => {
  const types = {
    Commitment: [
      { name: "id", type: "bytes32" },
      { name: "solver", type: "address" },
      { name: "bond", type: "uint256" },
      { name: "salt", type: "uint256" },
      { name: "deadline", type: "uint32" },
      { name: "inputs", type: "Input[]" },
      { name: "output", type: "Output" },
      { name: "extraData", type: "string" },
    ],
    Input: [
      { name: "chain", type: "string" },
      { name: "payment", type: "InputPayment" },
      { name: "refunds", type: "InputRefund[]" },
    ],
    InputPayment: [
      { name: "to", type: "string" },
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
