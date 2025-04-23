import { hashStruct } from "viem";

import { normalizeOrder, Order, ORDER_EIP712_TYPES } from "../order";
import {
  ChainIdToVmType,
  encodeBytes,
  encodeTransactionId,
  getChainVmType,
} from "../utils";

export type SolverFillMessage = {
  data: {
    order: Order;
    orderSignature: string;
    inputs: {
      transactionId: string;
      onchainId: string;
      inputIndex: number;
    }[];
    fill: {
      transactionId: string;
    };
  };
  result: {
    validated: boolean;
    totalWeightedInputPaymentBpsDiff: number;
  };
};

export const getSolverFillMessageHash = (
  message: SolverFillMessage,
  chainsConfig: ChainIdToVmType
) => {
  const vmType = (chainId: number) => getChainVmType(chainId, chainsConfig);

  return hashStruct({
    types: {
      SolverFill: [
        { name: "data", type: "Data" },
        { name: "result", type: "Result" },
      ],
      Data: [
        { name: "order", type: "Order" },
        { name: "orderSignature", type: "bytes" },
        { name: "inputs", type: "Input[]" },
        { name: "fill", type: "Fill" },
      ],
      Result: [
        { name: "validated", type: "boolean" },
        { name: "totalWeightedInputPaymentBpsDiff", type: "uint256" },
      ],
      ...ORDER_EIP712_TYPES,
      Input: [
        { name: "transactionId", type: "bytes" },
        { name: "onchainId", type: "bytes32" },
        { name: "inputIndex", type: "uint32" },
      ],
      Fill: [{ name: "transactionId", type: "bytes" }],
    },
    primaryType: "SolverFill",
    data: {
      data: {
        order: normalizeOrder(message.data.order, chainsConfig),
        orderSignature: encodeBytes(message.data.orderSignature),
        inputs: message.data.inputs.map((input) => ({
          transactionId: encodeTransactionId(
            input.transactionId,
            vmType(message.data.order.inputs[input.inputIndex].payment.chainId)
          ),
          onchainId: input.onchainId,
          inputIndex: input.inputIndex,
        })),
        fill: {
          transactionId: encodeTransactionId(
            message.data.fill.transactionId,
            vmType(message.data.order.output.chainId)
          ),
        },
      },
      result: {
        validated: message.result.validated,
        totalWeightedInputPaymentBpsDiff:
          message.result.totalWeightedInputPaymentBpsDiff,
      },
    },
  });
};
