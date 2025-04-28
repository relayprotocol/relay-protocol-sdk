import { hashStruct } from "viem";

import { encodeBytes } from "../utils";

export enum EscrowWithdrawalStatus {
  PENDING = 0,
  EXECUTED = 1,
  EXPIRED = 2,
}

export type EscrowWithdrawalMessage = {
  data: {
    chainId: number;
    withdrawal: string;
  };
  result: {
    withdrawalId: string;
    status: EscrowWithdrawalStatus;
  };
};

export const getEscrowWithdrawalMessageId = (
  message: EscrowWithdrawalMessage
) => {
  return hashStruct({
    types: {
      EscrowWithdrawal: [
        { name: "data", type: "Data" },
        { name: "result", type: "Result" },
      ],
      Data: [
        { name: "chainId", type: "uint256" },
        { name: "withdrawal", type: "bytes" },
      ],
      Result: [
        { name: "withdrawalId", type: "bytes32" },
        { name: "status", type: "uint8" },
      ],
    },
    primaryType: "EscrowWithdrawal",
    data: {
      data: {
        chainId: message.data.chainId,
        withdrawal: encodeBytes(message.data.withdrawal),
      },
      result: {
        withdrawalId: message.result.withdrawalId,
        status: message.result.status,
      },
    },
  });
};
