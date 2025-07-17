import * as anchor from "@coral-xyz/anchor";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import { bcs } from "@mysten/sui/bcs";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { sha256 } from "js-sha256";
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

import { RelayDepositoryIdl } from "./common/solana-vm/idls/RelayDepositoryIdl";

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

type DecodedEthereumVmWithdrawal = {
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

type DecodedSolanaVmWithdrawal = {
  vmType: "solana-vm";
  withdrawal: {
    recipient: string;
    token: string;
    amount: string;
    nonce: string;
    expiration: number;
  };
};

type DecodedSuiVmWithdrawal = {
  vmType: "sui-vm";
  withdrawal: {
    recipient: string;
    coinType: string;
    amount: string;
    nonce: string;
    expiration: number;
  };
};

type DecodedBitcoinVmWithdrawal = {
  vmType: "bitcoin-vm";
  withdrawal: {
    recipient: string;
    amount: string;
    nonce: string;
    expiration: number;
    txId: string;
  };
};

type DecodedWithdrawal =
  | DecodedEthereumVmWithdrawal
  | DecodedSolanaVmWithdrawal
  | DecodedSuiVmWithdrawal
  | DecodedBitcoinVmWithdrawal;

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
        const coder = new BorshCoder(RelayDepositoryIdl as Idl);
        return (
          "0x" +
          coder.types
            .encode("TransferRequest", {
              recipient: new PublicKey(decodedWithdrawal.withdrawal.recipient),
              token:
                decodedWithdrawal.withdrawal.token ===
                SystemProgram.programId.toBase58()
                  ? null
                  : new PublicKey(decodedWithdrawal.withdrawal.token),
              amount: new anchor.BN(decodedWithdrawal.withdrawal.amount),
              nonce: new anchor.BN(decodedWithdrawal.withdrawal.nonce),
              expiration: new anchor.BN(
                decodedWithdrawal.withdrawal.expiration
              ),
            })
            .toString("hex")
        );
      } catch {
        throw new Error("Failed to encode withdrawal");
      }
    }

    case "sui-vm": {
      try {
        return (
          "0x" +
          Buffer.from(
            bcs
              .struct("TransferRequest", {
                recipient: bcs.Address,
                amount: bcs.u64(),
                coin_type: bcs.struct("TypeName", {
                  name: bcs.string(),
                }),
                nonce: bcs.u64(),
                expiration: bcs.u64(),
              })
              .serialize({
                recipient: decodedWithdrawal.withdrawal.recipient,
                amount: BigInt(decodedWithdrawal.withdrawal.amount),
                coin_type: {
                  name: decodedWithdrawal.withdrawal.coinType,
                },
                nonce: BigInt(decodedWithdrawal.withdrawal.nonce),
                expiration: BigInt(decodedWithdrawal.withdrawal.expiration),
              })
              .toBytes()
          ).toString("hex")
        );
      } catch {
        throw new Error("Failed to encode withdrawal");
      }
    }

    case "bitcoin-vm": {
      try {
        const bitcoinData = {
          recipient: decodedWithdrawal.withdrawal.recipient,
          amount: decodedWithdrawal.withdrawal.amount,
          nonce: decodedWithdrawal.withdrawal.nonce,
          expiration: decodedWithdrawal.withdrawal.expiration,
          txId: decodedWithdrawal.withdrawal.txId,
        };
        
        return "0x" + Buffer.from(JSON.stringify(bitcoinData)).toString("hex");
      } catch {
        throw new Error("Failed to encode Bitcoin withdrawal");
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

        const coder = new BorshCoder(RelayDepositoryIdl as Idl);
        const request = coder.types.decode("TransferRequest", buffer);

        return {
          vmType: "solana-vm",
          withdrawal: {
            recipient: request.recipient.toBase58(),
            token: request.token
              ? request.token.toBase58()
              : SystemProgram.programId.toBase58(),
            amount: request.amount.toString(),
            nonce: request.nonce.toString(),
            expiration: request.expiration.toNumber(),
          },
        };
      } catch {
        throw new Error("Failed to decode withdrawal");
      }
    }

    case "sui-vm": {
      try {
        const buffer = Uint8Array.from(
          Buffer.from(encodedWithdrawal.substring(2), "hex")
        );

        const request = bcs
          .struct("TransferRequest", {
            recipient: bcs.Address,
            amount: bcs.u64(),
            coin_type: bcs.struct("TypeName", {
              name: bcs.string(),
            }),
            nonce: bcs.u64(),
            expiration: bcs.u64(),
          })
          .parse(buffer);

        return {
          vmType: "sui-vm",
          withdrawal: {
            recipient: request.recipient,
            coinType: request.coin_type.name,
            amount: request.amount.toString(),
            nonce: request.nonce.toString(),
            expiration: Number(request.expiration.toString()),
          },
        };
      } catch {
        throw new Error("Failed to decode withdrawal");
      }
    }

    case "bitcoin-vm": {
      try {
        const buffer = Buffer.from(encodedWithdrawal.substring(2), "hex");
        const bitcoinData = JSON.parse(buffer.toString());
        
        return {
          vmType: "bitcoin-vm",
          withdrawal: {
            recipient: bitcoinData.recipient,
            amount: bitcoinData.amount,
            nonce: bitcoinData.nonce,
            txId: bitcoinData.txId,
            expiration: Number(bitcoinData.expiration),
          },
        };
      } catch {
        throw new Error("Failed to decode Bitcoin withdrawal");
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
      const coder = new BorshCoder(RelayDepositoryIdl as Idl);
      const encodedWithdrawal = coder.types.encode("TransferRequest", {
        recipient: new PublicKey(decodedWithdrawal.withdrawal.recipient),
        token:
          decodedWithdrawal.withdrawal.token ===
          SystemProgram.programId.toBase58()
            ? null
            : new PublicKey(decodedWithdrawal.withdrawal.token),
        amount: new anchor.BN(decodedWithdrawal.withdrawal.amount),
        nonce: new anchor.BN(decodedWithdrawal.withdrawal.nonce),
        expiration: new anchor.BN(decodedWithdrawal.withdrawal.expiration),
      });

      return (
        "0x" +
        Buffer.from(sha256.create().update(encodedWithdrawal).array()).toString(
          "hex"
        )
      );
    }

    case "sui-vm": {
      const encodedWithdrawal =
        "0x" +
        Buffer.from(
          bcs
            .struct("TransferRequest", {
              recipient: bcs.Address,
              amount: bcs.u64(),
              coin_type: bcs.struct("TypeName", {
                name: bcs.string(),
              }),
              nonce: bcs.u64(),
              expiration: bcs.u64(),
            })
            .serialize({
              recipient: decodedWithdrawal.withdrawal.recipient,
              amount: BigInt(decodedWithdrawal.withdrawal.amount),
              coin_type: {
                name: decodedWithdrawal.withdrawal.coinType,
              },
              nonce: BigInt(decodedWithdrawal.withdrawal.nonce),
              expiration: BigInt(decodedWithdrawal.withdrawal.expiration),
            })
            .toBytes()
        ).toString("hex");

      return "0x" + sha256.create().update(encodedWithdrawal).hex();
    }

    case "bitcoin-vm": {
      const bitcoinData = {
        recipient: decodedWithdrawal.withdrawal.recipient,
        amount: decodedWithdrawal.withdrawal.amount,
        nonce: decodedWithdrawal.withdrawal.nonce,
        expiration: decodedWithdrawal.withdrawal.expiration,
        txId: decodedWithdrawal.withdrawal.txId,
      };
      
      const encodedWithdrawal = "0x" + Buffer.from(JSON.stringify(bitcoinData)).toString("hex");
      return "0x" + sha256.create().update(encodedWithdrawal).hex();
    }

    default:
      throw new Error("Unsupported vm type");
  }
};
