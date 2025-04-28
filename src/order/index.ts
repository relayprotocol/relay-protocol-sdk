import { decodeAbiParameters, hashStruct, Hex, parseAbiParameters } from "viem";

import {
  ChainIdToVmType,
  VmType,
  encodeAddress,
  encodeBytes,
  getChainVmType,
} from "../utils";

export type Order = {
  // The wallet of the solver given exclusive filling rights (must be an ethereum-vm eoa)
  solver: {
    chainId: number;
    address: string;
  };

  // Random salt value to ensure order uniqueness
  salt: string;

  // An order can have multiple inputs, each specifying:
  inputs: {
    // - the input payment details
    payment: {
      chainId: number;
      currency: string;
      amount: string;
      weight: string;
    };
    // - a list of refund options when the solver is unable to fulfill the request
    refunds: {
      chainId: number;
      recipient: string;
      currency: string;
      minimumAmount: string;
      deadline: number;
      extraData: string;
    }[];
  }[];

  // An order can have a single output, specifying:
  output: {
    // - the chain id of the output fill
    chainId: number;
    // - the output payments details
    payments: {
      recipient: string;
      currency: string;
      minimumAmount: string;
      expectedAmount: string;
    }[];
    // - a list of calls to be executed (encoded based on the chain's vm type)
    calls: string[];
    // - deadline for execution
    deadline: number;
    // - extra data (encoded based on the chain's vm type)
    extraData: string;
  };

  // An order can specify hub fees to be paid on successful fill
  fees: {
    recipientChainId: number;
    recipientAddress: string;
    currencyChainId: number;
    currencyAddress: string;
    amount: string;
  }[];
};

export const ORDER_EIP712_TYPES = {
  Order: [
    { name: "solver", type: "Solver" },
    { name: "salt", type: "uint256" },
    { name: "inputs", type: "Input[]" },
    { name: "output", type: "Output" },
    { name: "fees", type: "Fee[]" },
  ],
  Solver: [
    { name: "chainId", type: "uint256" },
    { name: "address", type: "address" },
  ],
  Input: [
    { name: "payment", type: "InputPayment" },
    { name: "refunds", type: "InputRefund[]" },
  ],
  InputPayment: [
    { name: "chainId", type: "uint256" },
    { name: "currency", type: "bytes" },
    { name: "amount", type: "uint256" },
    { name: "weight", type: "uint256" },
  ],
  InputRefund: [
    { name: "chainId", type: "uint256" },
    { name: "recipient", type: "bytes" },
    { name: "currency", type: "bytes" },
    { name: "minimumAmount", type: "uint256" },
    { name: "deadline", type: "uint32" },
    { name: "extraData", type: "bytes" },
  ],
  Output: [
    { name: "chainId", type: "uint256" },
    { name: "payments", type: "OutputPayment[]" },
    { name: "deadline", type: "uint32" },
    { name: "calls", type: "bytes[]" },
    { name: "extraData", type: "bytes" },
  ],
  OutputPayment: [
    { name: "recipient", type: "bytes" },
    { name: "currency", type: "bytes" },
    { name: "minimumAmount", type: "uint256" },
    { name: "expectedAmount", type: "uint256" },
  ],
  Fee: [
    { name: "recipientChainId", type: "uint256" },
    { name: "recipientAddress", type: "bytes" },
    { name: "currencyChainId", type: "uint256" },
    { name: "currencyAddress", type: "bytes" },
    { name: "amount", type: "uint256" },
  ],
};

export const normalizeOrder = (order: Order, chainsConfig: ChainIdToVmType) => {
  const vmType = (chainId: number) => getChainVmType(chainId, chainsConfig);

  return {
    solver: {
      chainId: order.solver.chainId,
      address: order.solver.address,
    },
    salt: order.salt,
    inputs: order.inputs.map((input) => ({
      payment: {
        chainId: input.payment.chainId,
        currency: encodeAddress(
          input.payment.currency,
          vmType(input.payment.chainId)
        ),
        amount: input.payment.amount,
        weight: input.payment.weight,
      },
      refunds: input.refunds.map((refund) => ({
        chainId: refund.chainId,
        recipient: encodeAddress(refund.recipient, vmType(refund.chainId)),
        currency: encodeAddress(refund.currency, vmType(refund.chainId)),
        minimumAmount: refund.minimumAmount,
        deadline: refund.deadline,
        extraData: encodeBytes(refund.extraData),
      })),
    })),
    output: {
      chainId: order.output.chainId,
      payments: order.output.payments.map((payment) => ({
        recipient: encodeAddress(
          payment.recipient,
          vmType(order.output.chainId)
        ),
        currency: encodeAddress(payment.currency, vmType(order.output.chainId)),
        minimumAmount: payment.minimumAmount,
        expectedAmount: payment.expectedAmount,
      })),
      calls: order.output.calls.map(encodeBytes),
      deadline: order.output.deadline,
      extraData: encodeBytes(order.output.extraData),
    },
    fees: order.fees.map((fee) => ({
      recipientChainId: fee.recipientChainId,
      recipientAddress: encodeAddress(
        fee.recipientAddress,
        vmType(fee.recipientChainId)
      ),
      currencyChainId: fee.currencyChainId,
      currencyAddress: encodeAddress(
        fee.currencyAddress,
        vmType(fee.currencyChainId)
      ),
      amount: fee.amount,
    })),
  };
};

export const getOrderId = (order: Order, config: ChainIdToVmType) => {
  return hashStruct({
    types: ORDER_EIP712_TYPES,
    primaryType: "Order",
    data: normalizeOrder(order, config),
  });
};

type DecodedCall = {
  vmType: "ethereum-vm";
  call: {
    to: string;
    data: string;
    value: string;
  };
};

export const decodeOrderCall = (call: string, vmType: VmType): DecodedCall => {
  switch (vmType) {
    case "ethereum-vm": {
      try {
        const result = decodeAbiParameters(
          parseAbiParameters([
            "(address to)",
            "(bytes data)",
            "(uint256 value)",
          ]),
          call as Hex
        );

        return {
          vmType: "ethereum-vm",
          call: {
            to: result[0].to.toLowerCase(),
            data: result[1].data.toLowerCase(),
            value: result[2].value.toString(),
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

type DecodedExtraData = {
  vmType: "ethereum-vm";
  extraData: {
    fillContract: string;
  };
};

export const decodeOrderExtraData = (
  extraData: string,
  vmType: VmType
): DecodedExtraData => {
  switch (vmType) {
    case "ethereum-vm": {
      try {
        const result = decodeAbiParameters(
          parseAbiParameters(["(address fillContract)"]),
          extraData as Hex
        );

        return {
          vmType: "ethereum-vm",
          extraData: {
            fillContract: result[0].fillContract.toLowerCase(),
          },
        };
      } catch {
        throw new Error("Failed to decode extra data");
      }
    }

    default:
      throw new Error("Unsupported vm type");
  }
};
