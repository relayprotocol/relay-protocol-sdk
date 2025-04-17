import { hashStruct } from "viem";

import { normalizeOrder, Order, ORDER_EIP712_TYPES } from "../order";
import {
  ChainIdToVmType,
  encodeBytes,
  encodeTransactionId,
  getChainVmType,
} from "../utils";

export type SolverRefundFillMessage = {
  data: {
    order: Order;
    orderSignature: string;
    inputs: {
      transactionId: string;
      inputIndex: number;
    }[];
    refunds: {
      transactionId: string;
      inputIndex: number;
      refundIndex: number;
    }[];
  };
  result: {
    isValid: boolean;
  };
};

export const getSolverRefundFillMessageHash = (
  message: SolverRefundFillMessage,
  config: ChainIdToVmType
) => {
  const vmType = (chainId: number) => getChainVmType(chainId, config);

  return hashStruct({
    types: {
      SolverRefundFill: [
        { name: "data", type: "Data" },
        { name: "result", type: "Result" },
      ],
      Data: [
        { name: "order", type: "Order" },
        { name: "orderSignature", type: "bytes" },
        { name: "inputs", type: "Input[]" },
        { name: "refunds", type: "Refund[]" },
      ],
      Result: [{ name: "isValid", type: "boolean" }],
      ...ORDER_EIP712_TYPES,
      Input: [
        { name: "transactionId", type: "bytes" },
        { name: "inputIndex", type: "uint32" },
      ],
      Refund: [
        { name: "transactionId", type: "bytes" },
        { name: "inputIndex", type: "uint32" },
        { name: "refundIndex", type: "uint32" },
      ],
    },
    primaryType: "SolverRefundFill",
    data: {
      data: {
        order: normalizeOrder(message.data.order, config),
        orderSignature: encodeBytes(message.data.orderSignature),
        inputs: message.data.inputs.map((input) => ({
          transactionId: encodeTransactionId(
            input.transactionId,
            vmType(message.data.order.inputs[input.inputIndex].payment.chainId)
          ),
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
        isValid: message.result.isValid,
      },
    },
  });
};
