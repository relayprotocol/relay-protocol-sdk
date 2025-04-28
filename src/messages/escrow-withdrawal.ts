import { decodeAbiParameters, hashStruct, Hex, parseAbiParameters } from "viem";

import { encodeBytes, VmType } from "../utils";

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

type DecodedWithdrawal = {
  vmType: "ethereum-vm";
  withdrawal: {
    calls: {
      to: string;
      data: string;
      value: string;
      allowFailure: boolean;
    }[];
    nonce: string;
    expiration: number;
  };
};

export const getDecodedWithdrawalId = (
  decodedWithdrawal: DecodedWithdrawal
): string => {
  switch (decodedWithdrawal.vmType) {
    case "ethereum-vm": {
      return hashStruct({
        types: {
          CallRequest: [
            { name: "calls", type: "Call[]" },
            { name: "nonce", type: "uint256" },
            { name: "expiration", type: "uint256" },
          ],
          Call: [
            { name: "to", type: "address" },
            { name: "data", type: "bytes" },
            { name: "value", type: "uint256" },
            { name: "allowFailure", type: "bool" },
          ],
        },
        primaryType: "CallRequest",
        data: {
          calls: decodedWithdrawal.withdrawal.calls,
          nonce: decodedWithdrawal.withdrawal.nonce,
          expiration: decodedWithdrawal.withdrawal.expiration,
        },
      });
    }

    default:
      throw new Error("Unsupported vm type");
  }
};

export const decodeWithdrawal = (
  withdrawal: string,
  vmType: VmType
): DecodedWithdrawal => {
  switch (vmType) {
    case "ethereum-vm": {
      try {
        const result = decodeAbiParameters(
          parseAbiParameters([
            "((address to, bytes data, uint256 value, bool allowFailure)[] calls, uint256 nonce, uint256 expiration)",
          ]),
          withdrawal as Hex
        );

        return {
          vmType: "ethereum-vm",
          withdrawal: {
            calls: result[0].calls.map((call) => ({
              to: call.to.toLowerCase(),
              data: call.data.toLowerCase(),
              value: call.value.toString(),
              allowFailure: call.allowFailure,
            })),
            nonce: result[0].nonce.toString(),
            expiration: Number(result[0].expiration.toString()),
          },
        };
      } catch {
        throw new Error("Failed to decode withdrawal");
      }
    }

    default:
      throw new Error("Unsupported vm type");
  }
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
