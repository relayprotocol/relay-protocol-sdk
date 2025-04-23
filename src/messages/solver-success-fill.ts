import { hashStruct } from "viem";

import { normalizeOrder, Order, ORDER_EIP712_TYPES } from "../order";
import {
  ChainIdToVmType,
  encodeBytes,
  encodeTransactionId,
  getChainVmType,
} from "../utils";

export type SolverSuccessFillMessage = {
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
    isValid: boolean;
  };
};

export const getSolverSuccessFillMessageHash = (
  message: SolverSuccessFillMessage,
  chainsConfig: ChainIdToVmType
) => {
  const vmType = (chainId: number) => getChainVmType(chainId, chainsConfig);

  return hashStruct({
    types: {
      SolverSuccessFill: [
        { name: "data", type: "Data" },
        { name: "result", type: "Result" },
      ],
      Data: [
        { name: "order", type: "Order" },
        { name: "orderSignature", type: "bytes" },
        { name: "inputs", type: "Input[]" },
        { name: "fill", type: "Fill" },
      ],
      Result: [{ name: "isValid", type: "boolean" }],
      ...ORDER_EIP712_TYPES,
      Input: [
        { name: "transactionId", type: "bytes" },
        { name: "onchainId", type: "bytes32" },
        { name: "inputIndex", type: "uint32" },
      ],
      Fill: [{ name: "transactionId", type: "bytes" }],
    },
    primaryType: "SolverSuccessFill",
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
        isValid: message.result.isValid,
      },
    },
  });
};
