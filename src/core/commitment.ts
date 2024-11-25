import { field, serialize, variant, vec } from "@dao-xyz/borsh";
import crypto from "crypto";

// At the moment, chains and addresses are represented as plain strings, but we should decide on standard formats for these:
// - chains: we can either use a standard numeric id or a standard string to identify chains
// - addresses: depending on the chain of the address we should clarify normalization and encoding rules (eg. lowercase / uppercase / mixedcase)

export enum ChainVmType {
  EVM = 0,
  SVM = 1,
  BVM = 2,
}

// Annotated classes used for the Borsh serialization

class AnnotatedInputPayment {
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

class AnnotatedRefundPayment {
  @field({ type: "string" })
  chain: string;

  @field({ type: "string" })
  to: string;

  @field({ type: "string" })
  currency: string;

  @field({ type: "u256" })
  minimumAmount: bigint;

  constructor(
    chain: string,
    to: string,
    currency: string,
    minimumAmount: bigint
  ) {
    this.chain = chain;
    this.to = to;
    this.currency = currency;
    this.minimumAmount = minimumAmount;
  }
}

class AnnotatedOutputPayment {
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

abstract class AnnotatedCallBase {}

@variant(ChainVmType.EVM)
class AnnotatedCallEvm extends AnnotatedCallBase {
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

class AnnotatedInput {
  @field({ type: "string" })
  chain: string;

  @field({ type: AnnotatedInputPayment })
  payment: AnnotatedInputPayment;

  @field({ type: vec(AnnotatedRefundPayment) })
  refunds: AnnotatedRefundPayment[];

  constructor(
    chain: string,
    payment: AnnotatedInputPayment,
    refunds: AnnotatedRefundPayment[]
  ) {
    this.chain = chain;
    this.payment = payment;
    this.refunds = refunds;
  }
}

class AnnotatedOutput {
  @field({ type: "string" })
  chain: string;

  @field({ type: AnnotatedOutputPayment })
  payment: AnnotatedOutputPayment;

  @field({ type: vec(AnnotatedCallBase) })
  calls: AnnotatedCallBase[];

  constructor(
    chain: string,
    payment: AnnotatedOutputPayment,
    calls: AnnotatedCallBase[]
  ) {
    this.chain = chain;
    this.payment = payment;
    this.calls = calls;
  }
}

class AnnotatedCommitment {
  @field({ type: "u256" })
  id: bigint;

  @field({ type: "string" })
  solver: string;

  @field({ type: "u256" })
  bond: bigint;

  @field({ type: "u256" })
  salt: bigint;

  @field({ type: vec(AnnotatedInput) })
  inputs: AnnotatedInput[];

  @field({ type: AnnotatedOutput })
  output: AnnotatedOutput;

  constructor(
    id: bigint,
    bond: bigint,
    solver: string,
    salt: bigint,
    inputs: AnnotatedInput[],
    output: AnnotatedOutput
  ) {
    this.id = id;
    this.bond = bond;
    this.solver = solver;
    this.salt = salt;
    this.inputs = inputs;
    this.output = output;
  }

  public static from(data: Commitment) {
    return new AnnotatedCommitment(
      BigInt(data.id),
      BigInt(data.bond),
      data.solver,
      BigInt(data.salt),
      data.inputs.map(
        (input) =>
          new AnnotatedInput(
            input.chain,
            new AnnotatedInputPayment(
              input.payment.to,
              input.payment.currency,
              BigInt(input.payment.amount),
              BigInt(input.payment.weight)
            ),
            input.refunds.map(
              (refund) =>
                new AnnotatedRefundPayment(
                  refund.chain,
                  refund.to,
                  refund.currency,
                  BigInt(refund.minimumAmount)
                )
            )
          )
      ),
      new AnnotatedOutput(
        data.output.chain,
        new AnnotatedOutputPayment(
          data.output.payment.to,
          data.output.payment.currency,
          BigInt(data.output.payment.minimumAmount),
          BigInt(data.output.payment.expectedAmount)
        ),
        data.output.calls.map(
          (call) =>
            new AnnotatedCallEvm(
              call.from,
              call.to,
              call.data,
              BigInt(call.value)
            )
        )
      )
    );
  }
}

export const COMMITMENT_ID_LENGTH_IN_BYTES = 32;

export type Commitment = {
  // The onchain identifier of the commitment
  // This is only needed to maintain backwards-compatibility with the old flows,
  // where the onchain identifier of the request is generated based on the order
  // format which the solver uses internally.
  id: string;

  // The address of the solver which will insure the request
  solver: string;

  // The bond amount for this commitment
  bond: string;

  // Random salt value to ensure commitment uniqueness
  salt: string;

  // A commitment can have multiple inputs, each specifying:
  // - the chain of the input payment
  // - the input payment details
  // - a list of refund options for when the payment was sent but the solver is unable to fulfill the commitment
  inputs: {
    chain: string;
    payment: {
      to: string;
      currency: string;
      amount: string;
      weight: string;
    };
    refunds: {
      chain: string;
      to: string;
      currency: string;
      minimumAmount: string;
    }[];
  }[];

  // A commitment can have a single output, specifying:
  // - the chain of the output fill
  // - the output payment details
  // - a list of calls to be executed
  output: {
    chain: string;
    payment: {
      to: string;
      currency: string;
      minimumAmount: string;
      expectedAmount: string;
    };
    calls: {
      from: string;
      to: string;
      data: string;
      value: string;
    }[];
  };
};

export const getCommitmentId = (commitment: Commitment) => {
  // We use Borsh (https://borsh.io/) so that every commitment has a deterministic serialization
  const serializedCommitment = serialize(AnnotatedCommitment.from(commitment));
  return (
    "0x" +
    crypto.createHash("sha256").update(serializedCommitment).digest("hex")
  );
};
