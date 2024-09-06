import stringify from "safe-stable-stringify";
import crypto from "crypto";

import { Chain, ChainVmType } from "./chains";

export type UserPayment = {
  to: string;
  currency: string;
  amount: string;
};

export type SolverPayment = {
  to: string;
  currency: string;
  minAmount: string;
};

export type Call = {
  vmType: Extract<ChainVmType, "evm">;
  data: {
    to: string;
    data: string;
    value: string;
  };
};

export type Commitment = {
  origins: {
    chain: Chain;
    payment: UserPayment;
    refundOptions: SolverPayment[];
  }[];
  destination: {
    chain: Chain;
    executions: {
      payment: SolverPayment;
      call?: Call;
    }[];
  };
  salt: string;
};

export const getCommitmentId = (commitment: Commitment) => {
  const stringifiedCommitment = stringify(commitment);
  return (
    "0x" +
    crypto.createHash("sha256").update(stringifiedCommitment).digest("hex")
  );
};
