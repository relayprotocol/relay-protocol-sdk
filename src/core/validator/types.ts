import { ChainVmType, Commitment } from "../commitment";

export type ChainConfig = {
  vmType: ChainVmType;
  rpcUrl: string;
  rpcTimeoutInMs?: number;
};

export enum Status {
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
}

export enum Side {
  INPUT = "INPUT",
  OUTPUT = "OUTPUT",
  REFUND = "REFUND",
}

export type ValidationResult =
  | { status: Status.SUCCESS; amount: bigint }
  | { status: Status.FAILURE; details: any };

export abstract class CommitmentValidator {
  // Validate the output execution of a commitment
  public abstract validateOutput(data: {
    // Should include the output chain config
    chainConfigs: Record<string, ChainConfig>;
    // The relevant commitment
    commitment: Commitment;
    // The solver's fill transaction
    transactionId: string;
    // The actual user payments, corresponding to the input payments specified by the commitment
    userPayments: {
      inputIndex: number;
      amount: string;
    }[];
  }): Promise<ValidationResult>;

  // Validate the refund execution of a commitment
  public abstract validateRefund(data: {
    // Should include the refund chain config
    chainConfigs: Record<string, ChainConfig>;
    // The relevant commitment
    commitment: Commitment;
    // The solver's refund transaction
    transactionId: string;
    // The actual user payments, corresponding to the input payments specified by the commitment
    userPayments: {
      inputIndex: number;
      amount: string;
    }[];
    // The input to refund
    inputIndex: number;
    // The refund option within the above input
    refundIndex: number;
  }): Promise<ValidationResult>;
}
