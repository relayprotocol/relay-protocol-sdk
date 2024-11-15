import { ChainVmType, Commitment } from "../commitment";

export type ChainConfig = {
  vmType: ChainVmType;
  rpcUrl: string;
};

export enum Status {
  SUCCESS = "success",
  FAILURE = "failure",
}

export type ValidationResult =
  | { status: Status.SUCCESS; amount: bigint }
  | { status: Status.FAILURE; reason: string };

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
}
