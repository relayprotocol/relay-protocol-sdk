import { Chain } from "./chains";

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

export type EvmCall = {
  to: string;
  data: string;
  value: string;
};

export type Call = EvmCall;

export type Commitment = {
  origins: {
    chain: Chain;
    payment: UserPayment;
    refundOptions: SolverPayment[];
    transactionId?: string;
  }[];
  destination: {
    chain: Chain;
    executions: {
      payment: SolverPayment;
      call?: Call;
    }[];
  };
};
