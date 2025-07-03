import {
  Address,
  bytesToHex,
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
import { RelayEscrowIdl } from "./idls/RelayEscrowIdl";
import * as anchor from "@coral-xyz/anchor";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { sha256 } from 'js-sha256';
import { bcs } from "@mysten/sui/bcs";

export enum DepositoryWithdrawalStatus {
  PENDING = 0,
  EXECUTED = 1,
  EXPIRED = 2,
}

export type DepositoryWithdrawalMessage = {
  data: {
    chainId: string;
    withdrawal: string;
  };
  result: {
    withdrawalId: string;
    depository: string;
    status: DepositoryWithdrawalStatus;
  };
};

export const getDepositoryWithdrawalMessageId = (
  message: DepositoryWithdrawalMessage,
  chainsConfig: ChainIdToVmType
) => {
  const vmType = (chainId: string) => getChainVmType(chainId, chainsConfig);

  return hashStruct({
    types: {
      DepositoryWithdrawal: [
        { name: "data", type: "Data" },
        { name: "result", type: "Result" },
      ],
      Data: [
        { name: "chainId", type: "string" },
        { name: "withdrawal", type: "bytes" },
      ],
      Result: [
        { name: "withdrawalId", type: "bytes32" },
        { name: "depository", type: "bytes" },
        { name: "status", type: "uint8" },
      ],
    },
    primaryType: "DepositoryWithdrawal",
    data: {
      data: {
        chainId: message.data.chainId,
        withdrawal: encodeBytes(message.data.withdrawal),
      },
      result: {
        withdrawalId: bytesToHex(encodeBytes(message.result.withdrawalId)),
        depository: encodeAddress(
          message.result.depository,
          vmType(message.data.chainId)
        ),
        status: message.result.status,
      },
    },
  });
};

// Encoding / decoding utilities

const solanaWithdrawalCoder = new BorshCoder(RelayEscrowIdl as Idl);

type DecodedEvmWithdrawal = {
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

export interface DecodedSolanaWithdrawal {
  vmType: "solana-vm";
  withdrawal: {
    recipient: string;
    token: string | null;
    amount: string;
    nonce: string;
    expiration: number;
  };
}

export interface DecodedSuiWithdrawal {
  vmType: "sui-vm";
  withdrawal: {
    recipient: string;
    coinType: string;
    amount: string;
    nonce: string;
    expiration: number;
  };
}

type DecodedWithdrawal = DecodedEvmWithdrawal | DecodedSolanaWithdrawal | DecodedSuiWithdrawal;

const createSolanaWithdrawalRequest = (withdrawal: DecodedSolanaWithdrawal['withdrawal']) => {
  return {
    recipient: new PublicKey(withdrawal.recipient),
    token: withdrawal.token ? new PublicKey(withdrawal.token) : null,
    amount: new anchor.BN(withdrawal.amount),
    nonce: new anchor.BN(withdrawal.nonce),
    expiration: new anchor.BN(withdrawal.expiration)
  };
};

const encodeSolanaWithdrawal = (withdrawal: DecodedSolanaWithdrawal['withdrawal']) => {
  const request = createSolanaWithdrawalRequest(withdrawal);
  return solanaWithdrawalCoder.types.encode('TransferRequest', request);
};

// Sui related utilities
const SuiTransferRequestStruct = bcs.struct('TransferRequest', {
  recipient: bcs.Address,
  amount: bcs.u64(),
  coin_type: bcs.struct('TypeName', {
      name: bcs.string(),
  }),
  nonce: bcs.u64(),
  expiration: bcs.u64()
});

const encodeSuiWithdrawal = (withdrawal: DecodedSuiWithdrawal['withdrawal']) => {
  const request = {
    recipient: withdrawal.recipient,
    amount: BigInt(withdrawal.amount),
    coin_type: {
      name: withdrawal.coinType
    },
    nonce: BigInt(withdrawal.nonce),
    expiration: BigInt(withdrawal.expiration)
  };
  return SuiTransferRequestStruct.serialize(request).toBytes();
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

    case "solana-vm": {
      try {
        const message = encodeSolanaWithdrawal(decodedWithdrawal.withdrawal);
        return '0x'+message.toString('hex');
      } catch {
        throw new Error("Failed to encode withdrawal");
      }
    }

    case "sui-vm": {
      try {
        const message = encodeSuiWithdrawal(decodedWithdrawal.withdrawal);
        return '0x'+Buffer.from(message).toString('hex');
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

    case "solana-vm": {
      try {
        const buffer = Buffer.from(encodedWithdrawal.substring(2), "hex");
        const request = solanaWithdrawalCoder.types.decode(
          'TransferRequest',
          buffer
        );
        return {
          vmType: "solana-vm",
          withdrawal: {
            recipient: request.recipient.toString(),
            token:  request.token ? request.token.toString() : null,
            amount: request.amount.toString(),
            nonce: request.nonce.toString(),
            expiration: request.expiration.toString(),
          }
        }
      } catch {
        throw new Error("Failed to decode withdrawal");
      }
    }

    case "sui-vm": {
      try {
        const buffer = Uint8Array.from(Buffer.from(encodedWithdrawal.substring(2), "hex"));
        const request = SuiTransferRequestStruct.parse(buffer);
        return {
          vmType: "sui-vm",
          withdrawal: {
            recipient: request.recipient,
            coinType: request.coin_type.name,
            amount: request.amount.toString(),
            nonce: request.nonce.toString(),
            expiration: Number(request.expiration.toString()),
          }
        }
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

    case "solana-vm": {
      const message = encodeSolanaWithdrawal(decodedWithdrawal.withdrawal);
      const requestHash = sha256.create().update(message).hex();
      return `0x${requestHash}`
    }

    case "sui-vm": {
      const message = encodeSuiWithdrawal(decodedWithdrawal.withdrawal);
      const requestHash = sha256.create().update(message).hex();
      return `0x${requestHash}`
    }

    default:
      throw new Error("Unsupported vm type");
  }
};
