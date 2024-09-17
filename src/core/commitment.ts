import stringify from "safe-stable-stringify";
import crypto from "crypto";

import { ChainVmType } from "./chains";

export type InputPayment = {
  to: string;
  currency: string;
  amount: string;
};

export type OutputPayment = {
  to: string;
  currency: string;
  minAmount: string;
};

export type EvmCall = {
  from: string;
  to: string;
  data: string;
  value: string;
};

export type Call = {
  vmType: Extract<ChainVmType, "evm">;
  data: EvmCall;
};

export type Commitment = {
  solver: string;
  inputs: {
    chain: string;
    payment: InputPayment;
    refund: OutputPayment[];
  }[];
  output: {
    chain: string;
    payment: OutputPayment & { expectedAmount: string; lateAmount: string };
    calls?: Call[];
  };
  salt: string;
};

// TODO: Switch to using Borsh instead
export const getCommitmentId = (commitment: Commitment) => {
  const stringifiedCommitment = stringify(commitment);
  return (
    "0x" +
    crypto.createHash("sha256").update(stringifiedCommitment).digest("hex")
  );
};
