import { Commitment } from "../commitment";

export type ParseInputResult =
  | { status: "success"; amountPaid: string }
  | { status: "failure"; reason: string };

export type ParseOutputResult =
  | { status: "success"; amountPaid: string; callsExecuted: boolean }
  | { status: "failure"; reason: string };

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
}
