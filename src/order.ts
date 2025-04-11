import { decodeAbiParameters, hashStruct, Hex } from "viem";

export type Order = {
  // The EVM address of the solver given exclusive filling rights
  solver: string;

  // Random salt value to ensure order uniqueness
  salt: bigint;

  // An order can have multiple inputs, each specifying:
  inputs: {
    // - the chain of the input payment
    chainId: number;
    // - the input payment details
    payment: {
      currency: string;
      amount: bigint;
      weight: bigint;
    };
    // - a list of refund options when the solver is unable to fulfill the request
    refunds: {
      chainId: number;
      to: string;
      currency: string;
      minimumAmount: bigint;
    }[];
  }[];

  // An order can have a single output, specifying:
  output: {
    // - the chain of the output fill
    chainId: number;
    // - the output payment details
    payment: {
      to: string;
      currency: string;
      minimumAmount: bigint;
      expectedAmount: bigint;
      fees: {
        recipient: string;
        amount: bigint;
      }[];
    };
    // - a list of calls to be executed (encoded based on the chain's vm type)
    calls: string[];
  };
};

type VmType = "ethereum-vm" | "solana-vm" | "tron-vm" | "ton-vm" | "sui-vm";

type DecodedCall = {
  vmType: "ethereum-vm";
  call: {
    to: string;
    data: string;
    value: bigint;
  };
};

export const decodeCall = (call: string, vmType: VmType): DecodedCall => {
  switch (vmType) {
    case "ethereum-vm": {
      try {
        const result = decodeAbiParameters(
          [{ type: "address" }, { type: "bytes" }, { type: "uint256" }],
          call as Hex
        );

        return {
          vmType: "ethereum-vm",
          call: {
            to: result[0],
            data: result[1],
            value: result[2],
          },
        };
      } catch {
        throw new Error("Failed to decode call");
      }
    }

    default:
      throw new Error("Unsupported vm type");
  }
};

export const getOrderHash = (order: Order) => {
  return hashStruct({
    types: {
      Order: [
        { name: "solver", type: "address" },
        { name: "salt", type: "uint256" },
        { name: "inputs", type: "Input[]" },
        { name: "output", type: "Output" },
      ],
      Input: [
        { name: "chainId", type: "uint256" },
        { name: "payment", type: "InputPayment" },
        { name: "refunds", type: "InputRefund[]" },
      ],
      InputPayment: [
        { name: "currency", type: "bytes" },
        { name: "amount", type: "uint256" },
        { name: "weight", type: "uint256" },
      ],
      InputRefund: [
        { name: "chainId", type: "uint256" },
        { name: "to", type: "bytes" },
        { name: "currency", type: "bytes" },
        { name: "minimumAmount", type: "uint256" },
      ],
      Output: [
        { name: "chainId", type: "uint256" },
        { name: "payment", type: "OutputPayment" },
        { name: "calls", type: "bytes[]" },
      ],
      OutputPayment: [
        { name: "to", type: "bytes" },
        { name: "currency", type: "bytes" },
        { name: "minimumAmount", type: "uint256" },
        { name: "expectedAmount", type: "uint256" },
        { name: "fees", type: "Fee[]" },
      ],
      Fee: [
        { name: "amount", type: "uint256" },
        { name: "recipient", type: "bytes" },
      ],
    },
    primaryType: "Order",
    data: order,
  });
};
