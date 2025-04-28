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
    status: number;
  };
};

export const getEscrowWithdrawalMessageHash = (
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
      Result: [{ name: "status", type: "uint8" }],
    },
    primaryType: "EscrowWithdrawal",
    data: {
      data: {
        chainId: message.data.chainId,
        withdrawal: encodeBytes(message.data.withdrawal),
      },
      result: {
        status: message.result.status,
      },
    },
  });
};
