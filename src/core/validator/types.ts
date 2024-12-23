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
  public abstract validateInput(data: {
    chainConfigs: Record<string, ChainConfig>;
    commitment: Commitment;
    inputIndex: number;
    transactionId: string;
  }): Promise<ValidationResult>;

  public abstract validateOutput(data: {
    chainConfigs: Record<string, ChainConfig>;
    commitment: Commitment;
    transactionId: string;
  }): Promise<ValidationResult>;

  public abstract validateRefund(data: {
    chainConfigs: Record<string, ChainConfig>;
    commitment: Commitment;
    inputIndex: number;
    refundIndex: number;
    transactionId: string;
  }): Promise<ValidationResult>;
}
