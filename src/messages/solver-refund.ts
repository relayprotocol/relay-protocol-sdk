import { bytesToHex, hashStruct } from "viem";

import { normalizeOrder, Order, ORDER_EIP712_TYPES } from "../order";
import {
  ChainIdToVmType,
  encodeBytes,
  encodeTransactionId,
  getChainVmType,
} from "../utils";

export enum SolverRefundStatus {
  FAILED = 0,
  SUCCESSFUL = 1,
}

export type SolverRefundMessage = {
  data: {
    order: Order;
    orderSignature: string;
    inputs: {
      transactionId: string;
      onchainId: string;
      inputIndex: number;
    }[];
    refunds: {
      transactionId: string;
      inputIndex: number;
      refundIndex: number;
    }[];
  };
  result: {
    orderId: string;
    status: SolverRefundStatus;
    totalWeightedInputPaymentBpsDiff: string;
  };
};

export const getSolverRefundMessageId = (
  message: SolverRefundMessage,
  chainsConfig: ChainIdToVmType
) => {
  const vmType = (chainId: string) => getChainVmType(chainId, chainsConfig);

  return hashStruct({
    types: {
      SolverRefund: [
        { name: "data", type: "Data" },
        { name: "result", type: "Result" },
      ],
      Data: [
        { name: "order", type: "Order" },
        { name: "orderSignature", type: "bytes" },
        { name: "inputs", type: "Input[]" },
        { name: "refunds", type: "Refund[]" },
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
      Refund: [
        { name: "transactionId", type: "bytes" },
        { name: "inputIndex", type: "uint32" },
        { name: "refundIndex", type: "uint32" },
      ],
    },
    primaryType: "SolverRefund",
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
        refunds: message.data.refunds.map((refund) => ({
          transactionId: encodeTransactionId(
            refund.transactionId,
            vmType(
              message.data.order.inputs[refund.inputIndex].refunds[
                refund.refundIndex
              ].chainId
            )
          ),
          inputIndex: refund.inputIndex,
          refundIndex: refund.refundIndex,
        })),
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
