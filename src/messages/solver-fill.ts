import { bytesToHex, hashStruct } from "viem";

import { normalizeOrder, Order, ORDER_EIP712_TYPES } from "../order";
import {
  ChainIdToVmType,
  encodeBytes,
  encodeTransactionId,
  getChainVmType,
} from "../utils";

export enum SolverFillStatus {
  FAILED = 0,
  SUCCESSFUL = 1,
}

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
    orderId: string;
    status: SolverFillStatus;
    totalWeightedInputPaymentBpsDiff: string;
  };
};

export const getSolverFillMessageId = (
  message: SolverFillMessage,
  chainsConfig: ChainIdToVmType
) => {
  const vmType = (chainId: string) => getChainVmType(chainId, chainsConfig);

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
        { name: "orderId", type: "bytes32" },
        { name: "status", type: "uint8" },
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
          onchainId: bytesToHex(encodeBytes(input.onchainId)),
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
        orderId: bytesToHex(encodeBytes(message.result.orderId)),
        status: message.result.status,
        totalWeightedInputPaymentBpsDiff:
          message.result.totalWeightedInputPaymentBpsDiff,
      },
    },
  });
};
