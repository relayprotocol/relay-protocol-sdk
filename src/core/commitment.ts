import { field, serialize, variant, vec } from "@dao-xyz/borsh";
import crypto from "crypto";

// Comments:
// - only inputs will ever have weights: refunds are treated as output payments

// At the moment, chains and addresses are represented as plain strings, but we should decide on standard formats for these:
// - chains: we can either use a standard numeric id or a standard string to identify chains
// - addresses: depending on the chain of the address we should clarify normalization and encoding rules (eg. lowercase / uppercase / mixedcase)

export enum ChainVmType {
  EVM = 0,
  SVM = 1,
  BVM = 2,
}

export class InputPayment {
  @field({ type: "string" })
  to: string;

  @field({ type: "string" })
  currency: string;

  @field({ type: "u256" })
  amount: bigint;

  @field({ type: "u256" })
  weight: bigint;

  constructor(to: string, currency: string, amount: bigint, weight: bigint) {
    this.to = to;
    this.currency = currency;
    this.amount = amount;
    this.weight = weight;
  }
}

export class RefundPayment {
  @field({ type: "string" })
  to: string;

  @field({ type: "string" })
  currency: string;

  @field({ type: "u256" })
  minimumAmount: bigint;

  constructor(to: string, currency: string, minimumAmount: bigint) {
    this.to = to;
    this.currency = currency;
    this.minimumAmount = minimumAmount;
  }
}

export class OutputPayment {
  @field({ type: "string" })
  to: string;

  @field({ type: "string" })
  currency: string;

  @field({ type: "u256" })
  expectedAmount: bigint;

  @field({ type: "u256" })
  minimumAmount: bigint;

  constructor(
    to: string,
    currency: string,
    minimumAmount: bigint,
    expectedAmount: bigint
  ) {
    this.to = to;
    this.currency = currency;
    this.minimumAmount = minimumAmount;
    this.expectedAmount = expectedAmount;
  }
}

abstract class CallBase {}

@variant(ChainVmType.EVM)
export class CallEvm extends CallBase {
  @field({ type: "string" })
  from: string;

  @field({ type: "string" })
  to: string;

  @field({ type: "string" })
  data: string;

  @field({ type: "u256" })
  value: bigint;

  constructor(from: string, to: string, data: string, value: bigint) {
    super();

    this.from = from;
    this.to = to;
    this.data = data;
    this.value = value;
  }
}

export class Input {
  @field({ type: "string" })
  chain: string;

  @field({ type: InputPayment })
  payment: InputPayment;

  @field({ type: vec(RefundPayment) })
  refunds: RefundPayment[];

  constructor(chain: string, payment: InputPayment, refunds: RefundPayment[]) {
    this.chain = chain;
    this.payment = payment;
    this.refunds = refunds;
  }
}

export class Output {
  @field({ type: "string" })
  chain: string;

  @field({ type: OutputPayment })
  payment: OutputPayment;

  @field({ type: vec(CallBase) })
  calls: CallBase[];

  constructor(chain: string, payment: OutputPayment, calls: CallBase[]) {
    this.chain = chain;
    this.payment = payment;
    this.calls = calls;
  }
}

export class Commitment {
  // The onchain identifier of the commitment
  // This is only needed to maintain backwards-compatibility with the old flows,
  // where the onchain identifier of the request is generated based on the order
  // format which the solver uses internally.
  @field({ type: "u256" })
  id: bigint;

  // The address of the solver which will insure the request
  @field({ type: "string" })
  solver: string;

  // The bond amount for this commitment
  @field({ type: "u256" })
  bond: bigint;

  // Random salt value to ensure commitment uniqueness
  @field({ type: "u256" })
  salt: bigint;

  // A commitment can have multiple inputs, each specifying:
  // - the chain of the input payment
  // - the input payment details
  // - a list of refund options for when the payment was sent but the solver is unable to fulfill the commitment
  @field({ type: vec(Input) })
  inputs: Input[];

  // A commitment can have a single output, specifying:
  // - the chain of the output fill
  // - the output payment details
  // - a list of calls to be executed
  @field({ type: Output })
  output: Output;

  constructor(
    id: bigint,
    bond: bigint,
    solver: string,
    salt: bigint,
    inputs: Input[],
    output: Output
  ) {
    this.id = id;
    this.bond = bond;
    this.solver = solver;
    this.salt = salt;
    this.inputs = inputs;
    this.output = output;
  }

  public static ID_LENGTH_IN_BYTES = 32;

  public static from(data: Commitment) {
    return new Commitment(
      data.id,
      data.bond,
      data.solver,
      data.salt,
      data.inputs.map(
        (input) =>
          new Input(
            input.chain,
            new InputPayment(
              input.payment.to,
              input.payment.currency,
              input.payment.amount,
              input.payment.weight
            ),
            input.refunds.map(
              (refund) =>
                new RefundPayment(
                  refund.to,
                  refund.currency,
                  refund.minimumAmount
                )
            )
          )
      ),
      new Output(
        data.output.chain,
        new OutputPayment(
          data.output.payment.to,
          data.output.payment.currency,
          data.output.payment.minimumAmount,
          data.output.payment.expectedAmount
        ),
        data.output.calls.map(
          (call) =>
            new CallEvm(
              (call as CallEvm).from,
              (call as CallEvm).to,
              (call as CallEvm).data,
              (call as CallEvm).value
            )
        )
      )
    );
  }
}

export const getCommitmentId = (commitment: Commitment) => {
  // We use Borsh (https://borsh.io/) so that every commitment has a deterministic serialization
  const serializedCommitment = serialize(commitment);
  return (
    "0x" +
    crypto.createHash("sha256").update(serializedCommitment).digest("hex")
  );
};
