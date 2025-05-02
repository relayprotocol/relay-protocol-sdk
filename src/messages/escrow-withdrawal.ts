import {
  Address,
  decodeAbiParameters,
  encodeAbiParameters,
  hashStruct,
  Hex,
  parseAbiParameters,
} from "viem";

import {
  ChainIdToVmType,
  encodeAddress,
  encodeBytes,
  getChainVmType,
  VmType,
} from "../utils";

// Main message

export enum EscrowWithdrawalStatus {
  PENDING = 0,
  EXECUTED = 1,
  EXPIRED = 2,
}

export type EscrowWithdrawalMessage = {
  data: {
    chainId: string;
    withdrawal: string;
  };
  result: {
    withdrawalId: string;
    escrow: string;
    status: EscrowWithdrawalStatus;
  };
};

export const getEscrowWithdrawalMessageId = (
  message: EscrowWithdrawalMessage,
  chainsConfig: ChainIdToVmType
) => {
  const vmType = (chainId: string) => getChainVmType(chainId, chainsConfig);

  return hashStruct({
    types: {
      EscrowWithdrawal: [
        { name: "data", type: "Data" },
        { name: "result", type: "Result" },
      ],
      Data: [
        { name: "chainId", type: "string" },
        { name: "withdrawal", type: "bytes" },
      ],
      Result: [
        { name: "withdrawalId", type: "bytes32" },
        { name: "escrow", type: "bytes" },
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
        escrow: encodeAddress(
          message.result.escrow,
          vmType(message.data.chainId)
        ),
        status: message.result.status,
      },
    },
  });
};

// Encoding / decoding utilities

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

export const encodeWithdrawal = (
  decodedWithdrawal: DecodedWithdrawal
): string => {
  switch (decodedWithdrawal.vmType) {
    case "ethereum-vm": {
      try {
        return encodeAbiParameters(
          parseAbiParameters([
            "((address to, bytes data, uint256 value, bool allowFailure)[] calls, uint256 nonce, uint256 expiration)",
          ]),
          [
            {
              calls: decodedWithdrawal.withdrawal.calls.map((call) => ({
                to: call.to as Address,
                data: call.data as Hex,
                value: BigInt(call.value),
                allowFailure: call.allowFailure,
              })),
              nonce: BigInt(decodedWithdrawal.withdrawal.nonce),
              expiration: BigInt(decodedWithdrawal.withdrawal.expiration),
            },
          ]
        );
      } catch {
        throw new Error("Failed to encode withdrawal");
      }
    }

    default:
      throw new Error("Unsupported vm type");
  }
};

export const decodeWithdrawal = (
  encodedWithdrawal: string,
  vmType: VmType
): DecodedWithdrawal => {
  switch (vmType) {
    case "ethereum-vm": {
      try {
        const result = decodeAbiParameters(
          parseAbiParameters([
            "((address to, bytes data, uint256 value, bool allowFailure)[] calls, uint256 nonce, uint256 expiration)",
          ]),
          encodedWithdrawal as Hex
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
