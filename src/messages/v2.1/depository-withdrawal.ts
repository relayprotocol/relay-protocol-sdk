import * as anchor from "@coral-xyz/anchor";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import { bcs } from "@mysten/sui/bcs";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { sha256 } from "js-sha256";
import * as tronweb from "tronweb";
import * as bitcoin from "bitcoinjs-lib";
import {
  Address,
  bytesToHex,
  decodeAbiParameters,
  encodeAbiParameters,
  hashStruct,
  Hex,
  parseAbiParameters,
  parseUnits,
} from "viem";

import {
  ChainIdToVmType,
  encodeAddress,
  encodeBytes,
  getChainVmType,
  getVmTypeNativeCurrency,
  VmType,
} from "../../utils";

import { RelayDepositoryIdl } from "../common/solana-vm/idls/RelayDepositoryIdl";

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

export type DecodedEthereumVmWithdrawal = {
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

export type DecodedTronVmWithdrawal = {
  vmType: "tron-vm";
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

export type DecodedSolanaVmWithdrawal = {
  vmType: "solana-vm";
  withdrawal: {
    domain: string;
    recipient: string;
    token: string;
    amount: string;
    nonce: string;
    expiration: number;
    vaultAddress: string;
  };
};

export type DecodedSuiVmWithdrawal = {
  vmType: "sui-vm";
  withdrawal: {
    recipient: string;
    coinType: string;
    amount: string;
    nonce: string;
    expiration: number;
  };
};

export type DecodedBitcoinVmWithdrawal = {
  vmType: "bitcoin-vm";
  withdrawal: {
    psbt: string;
  };
};

export type DecodedHyperliquidVmWithdrawal = {
  vmType: "hyperliquid-vm";
  withdrawal: {
    txType: number;
    parameters:
      | {
          type: "UsdSend";
          hyperliquidChain: string;
          destination: string;
          amount: string;
          time: string;
        }
      | {
          type: "SendAsset";
          hyperliquidChain: string;
          destination: string;
          sourceDex: string;
          destinationDex: string;
          token: string;
          amount: string;
          fromSubAccount: string;
          nonce: string;
        };
  };
};

type DecodedWithdrawal =
  | DecodedEthereumVmWithdrawal
  | DecodedSolanaVmWithdrawal
  | DecodedSuiVmWithdrawal
  | DecodedBitcoinVmWithdrawal
  | DecodedTronVmWithdrawal
  | DecodedHyperliquidVmWithdrawal;

export const encodeWithdrawal = (
  decodedWithdrawal: DecodedWithdrawal
): string => {
  switch (decodedWithdrawal.vmType) {
    case "ethereum-vm": {
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
    }

    case "tron-vm": {
      const callsArray = decodedWithdrawal.withdrawal.calls.map((c) => [
        c.to.replace(tronweb.utils.address.ADDRESS_PREFIX_REGEX, "0x"),
        c.data,
        BigInt(c.value),
        Boolean(c.allowFailure),
      ]);

      const types = [
        "tuple(tuple(address,bytes,uint256,bool)[],uint256,uint256)",
      ];
      const values = [
        [
          callsArray,
          BigInt(decodedWithdrawal.withdrawal.nonce),
          BigInt(decodedWithdrawal.withdrawal.expiration),
        ],
      ];

      return tronweb.utils.abi.encodeParams(types, values);
    }

    case "solana-vm": {
      const coder = new BorshCoder(RelayDepositoryIdl as Idl);
      return (
        "0x" +
        coder.types
          .encode("TransferRequest", {
            domain: Buffer.from(
              decodedWithdrawal.withdrawal.domain.slice(2),
              "hex"
            ),
            recipient: new PublicKey(decodedWithdrawal.withdrawal.recipient),
            token:
              decodedWithdrawal.withdrawal.token ===
              SystemProgram.programId.toBase58()
                ? null
                : new PublicKey(decodedWithdrawal.withdrawal.token),
            amount: new anchor.BN(decodedWithdrawal.withdrawal.amount),
            nonce: new anchor.BN(decodedWithdrawal.withdrawal.nonce),
            expiration: new anchor.BN(decodedWithdrawal.withdrawal.expiration),
            vault_address: new PublicKey(
              decodedWithdrawal.withdrawal.vaultAddress
            ),
          })
          .toString("hex")
      );
    }

    case "sui-vm": {
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
    }

    case "bitcoin-vm": {
      return "0x" + decodedWithdrawal.withdrawal.psbt;
    }

    case "hyperliquid-vm": {
      const { txType, parameters } = decodedWithdrawal.withdrawal;

      let encodedParameters: string;
      switch (parameters.type) {
        case "UsdSend": {
          encodedParameters = encodeAbiParameters(
            parseAbiParameters([
              "(string hyperliquidChain, string destination, string amount, uint64 time)",
            ]),
            [
              {
                hyperliquidChain: parameters.hyperliquidChain,
                destination: parameters.destination,
                amount: parameters.amount,
                time: BigInt(parameters.time),
              },
            ]
          );

          break;
        }

        case "SendAsset": {
          encodedParameters = encodeAbiParameters(
            parseAbiParameters([
              "(string hyperliquidChain, string destination, string sourceDex, string destinationDex, string token, string amount, string fromSubAccount, uint64 nonce)",
            ]),
            [
              {
                hyperliquidChain: parameters.hyperliquidChain,
                destination: parameters.destination,
                sourceDex: parameters.sourceDex,
                destinationDex: parameters.destinationDex,
                token: parameters.token,
                amount: parameters.amount,
                fromSubAccount: parameters.fromSubAccount,
                nonce: BigInt(parameters.nonce),
              },
            ]
          );

          break;
        }

        default: {
          throw new Error(
            `Unsupported Hyperliquid transaction type ${
              (parameters as any).type
            }`
          );
        }
      }

      return encodeAbiParameters(
        parseAbiParameters(["(uint8 txType, bytes parameters)"]),
        [
          {
            txType,
            parameters: encodedParameters as Hex,
          },
        ]
      );
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
    }

    case "tron-vm": {
      const types = [
        "tuple(tuple(address,bytes,uint256,bool)[],uint256,uint256)",
      ];
      const decoded = tronweb.utils.abi.decodeParams(
        [],
        types,
        encodedWithdrawal
      );
      const [argTuple] = decoded;
      const [decodedCalls, decodedNonce, decodedExpiration] = argTuple;
      return {
        vmType: "tron-vm",
        withdrawal: {
          calls: decodedCalls.map(([to, data, value, allowFailure]: any) => ({
            to: to
              .toLowerCase()
              .replace("0x", tronweb.utils.address.ADDRESS_PREFIX),
            data: data.toLowerCase(),
            value: BigInt(value).toString(),
            allowFailure: Boolean(allowFailure),
          })),
          nonce: BigInt(decodedNonce).toString(),
          expiration: Number(BigInt(decodedExpiration).toString()),
        },
      };
    }

    case "solana-vm": {
      const buffer = Buffer.from(encodedWithdrawal.substring(2), "hex");

      const coder = new BorshCoder(RelayDepositoryIdl as Idl);
      const request = coder.types.decode("TransferRequest", buffer);

      return {
        vmType: "solana-vm",
        withdrawal: {
          domain: "0x" + Buffer.from(request.domain).toString("hex"),
          recipient: request.recipient.toBase58(),
          token: request.token
            ? request.token.toBase58()
            : SystemProgram.programId.toBase58(),
          amount: request.amount.toString(),
          nonce: request.nonce.toString(),
          expiration: request.expiration.toNumber(),
          vaultAddress: request.vault_address.toBase58(),
        },
      };
    }

    case "sui-vm": {
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
    }

    case "bitcoin-vm": {
      return {
        vmType: "bitcoin-vm",
        withdrawal: {
          psbt: encodedWithdrawal.slice(2),
        },
      };
    }

    case "hyperliquid-vm": {
      const result = decodeAbiParameters(
        parseAbiParameters(["(uint8 txType, bytes parameters)"]),
        encodedWithdrawal as Hex
      );

      const { txType, parameters } = result[0];

      switch (txType) {
        case 0: {
          // UsdSend
          const paramResult = decodeAbiParameters(
            parseAbiParameters([
              "(string hyperliquidChain, string destination, string amount, uint64 time)",
            ]),
            parameters
          );

          const { hyperliquidChain, destination, amount, time } =
            paramResult[0];

          return {
            vmType: "hyperliquid-vm",
            withdrawal: {
              txType: Number(txType),
              parameters: {
                type: "UsdSend" as const,
                hyperliquidChain,
                destination,
                amount,
                time: time.toString(),
              },
            },
          };
        }

        case 1: {
          // SendAsset
          const paramResult = decodeAbiParameters(
            parseAbiParameters([
              "(string hyperliquidChain, string destination, string sourceDex, string destinationDex, string token, string amount, string fromSubAccount, uint64 nonce)",
            ]),
            parameters
          );

          const {
            hyperliquidChain,
            destination,
            sourceDex,
            destinationDex,
            token,
            amount,
            fromSubAccount,
            nonce,
          } = paramResult[0];

          return {
            vmType: "hyperliquid-vm",
            withdrawal: {
              txType: Number(txType),
              parameters: {
                type: "SendAsset" as const,
                hyperliquidChain,
                destination,
                sourceDex,
                destinationDex,
                token,
                amount,
                fromSubAccount,
                nonce: nonce.toString(),
              },
            },
          };
        }

        default: {
          throw new Error(
            `Unsupported Hyperliquid transaction type: ${txType}`
          );
        }
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

    case "tron-vm": {
      return tronweb.utils._TypedDataEncoder.hashStruct(
        "CallRequest",
        {
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
        {
          calls: decodedWithdrawal.withdrawal.calls,
          nonce: decodedWithdrawal.withdrawal.nonce,
          expiration: decodedWithdrawal.withdrawal.expiration,
        }
      );
    }

    case "solana-vm": {
      const coder = new BorshCoder(RelayDepositoryIdl as Idl);
      const encodedWithdrawal = coder.types.encode("TransferRequest", {
        domain: Buffer.from(
          decodedWithdrawal.withdrawal.domain.slice(2),
          "hex"
        ),
        recipient: new PublicKey(decodedWithdrawal.withdrawal.recipient),
        token:
          decodedWithdrawal.withdrawal.token ===
          SystemProgram.programId.toBase58()
            ? null
            : new PublicKey(decodedWithdrawal.withdrawal.token),
        amount: new anchor.BN(decodedWithdrawal.withdrawal.amount),
        nonce: new anchor.BN(decodedWithdrawal.withdrawal.nonce),
        expiration: new anchor.BN(decodedWithdrawal.withdrawal.expiration),
        vault_address: new PublicKey(decodedWithdrawal.withdrawal.vaultAddress),
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
      const encodedWithdrawal = "0x" + decodedWithdrawal.withdrawal.psbt;

      return "0x" + sha256.create().update(encodedWithdrawal).hex();
    }

    case "hyperliquid-vm": {
      const { parameters } = decodedWithdrawal.withdrawal;

      switch (parameters.type) {
        case "UsdSend": {
          return hashStruct({
            types: {
              "HyperliquidTransaction:UsdSend": [
                { name: "hyperliquidChain", type: "string" },
                { name: "destination", type: "string" },
                { name: "amount", type: "string" },
                { name: "time", type: "uint64" },
              ],
            },
            primaryType: "HyperliquidTransaction:UsdSend",
            data: {
              hyperliquidChain: parameters.hyperliquidChain,
              destination: parameters.destination,
              amount: parameters.amount,
              time: parameters.time,
            },
          });
        }

        case "SendAsset": {
          return hashStruct({
            types: {
              "HyperliquidTransaction:SendAsset": [
                { name: "hyperliquidChain", type: "string" },
                { name: "destination", type: "string" },
                { name: "sourceDex", type: "string" },
                { name: "destinationDex", type: "string" },
                { name: "token", type: "string" },
                { name: "amount", type: "string" },
                { name: "fromSubAccount", type: "string" },
                { name: "nonce", type: "uint64" },
              ],
            },
            primaryType: "HyperliquidTransaction:SendAsset",
            data: {
              hyperliquidChain: parameters.hyperliquidChain,
              destination: parameters.destination,
              sourceDex: parameters.sourceDex,
              destinationDex: parameters.destinationDex,
              token: parameters.token,
              amount: parameters.amount,
              fromSubAccount: parameters.fromSubAccount,
              nonce: parameters.nonce,
            },
          });
        }

        default: {
          throw new Error(
            `Unsupported Hyperliquid transaction type ${
              (parameters as any).type
            }`
          );
        }
      }
    }

    default:
      throw new Error("Unsupported vm type");
  }
};

export const getDecodedWithdrawalCurrency = (
  decodedWithdrawal: DecodedWithdrawal
): string => {
  switch (decodedWithdrawal.vmType) {
    case "bitcoin-vm": {
      return getVmTypeNativeCurrency(decodedWithdrawal.vmType);
    }

    case "ethereum-vm": {
      const firstCall = decodedWithdrawal.withdrawal.calls[0];
      return firstCall.data === "0x"
        ? getVmTypeNativeCurrency(decodedWithdrawal.vmType)
        : firstCall.to;
    }

    case "tron-vm": {
      const firstCall = decodedWithdrawal.withdrawal.calls[0];
      return firstCall.data === "0x"
        ? getVmTypeNativeCurrency(decodedWithdrawal.vmType)
        : firstCall.to;
    }

    case "solana-vm": {
      return decodedWithdrawal.withdrawal.token;
    }

    case "sui-vm": {
      return decodedWithdrawal.withdrawal.coinType;
    }

    case "hyperliquid-vm": {
      const { parameters } = decodedWithdrawal.withdrawal;

      switch (parameters.type) {
        case "UsdSend": {
          return getVmTypeNativeCurrency(decodedWithdrawal.vmType);
        }

        case "SendAsset": {
          const SPOT_USDC = "0x6d1e7cde53ba9467b783cb7c530ce054";

          const tokenAddress = parameters.token.split(":")[1].toLowerCase();
          const tokenDex = parameters.sourceDex;
          if (tokenDex === "" && tokenAddress !== SPOT_USDC) {
            throw new Error("Only USDC is supported as a Perps token");
          }

          return tokenDex === "spot"
            ? tokenAddress.toLowerCase()
            : tokenDex === ""
            ? getVmTypeNativeCurrency(decodedWithdrawal.vmType)
            : tokenAddress.toLowerCase() +
              Buffer.from(tokenDex, "ascii").toString("hex");
        }

        default:
          throw new Error(
            `Unsupported Hyperliquid transaction type ${
              (parameters as any).type
            }`
          );
      }
    }
  }
};

const decodeERC20TransferParams = (data: string) => {
  // ERC20 / TRC20 `transfer(address,uint256)` selector is 0xa9059cbb
  const TRANSFER_SELECTOR = "0xa9059cbb";
  if (data.toLowerCase().startsWith(TRANSFER_SELECTOR.toLowerCase())) {
    const paramsData = ("0x" + data.slice(TRANSFER_SELECTOR.length)) as Hex;
    const params = decodeAbiParameters(
      parseAbiParameters(["address", "uint256"]),
      paramsData
    );
    return params;
  } else {
    throw new Error(`Unsupported function call data: ${data}`);
  }
};

export const getDecodedWithdrawalAmount = (
  decodedWithdrawal: DecodedWithdrawal
): string => {
  switch (decodedWithdrawal.vmType) {
    case "ethereum-vm": {
      const firstCall = decodedWithdrawal.withdrawal.calls[0];
      if (firstCall.data === "0x") {
        return firstCall.value;
      } else {
        const [, amount] = decodeERC20TransferParams(firstCall.data);
        return amount.toString();
      }
    }

    case "tron-vm": {
      const firstCall = decodedWithdrawal.withdrawal.calls[0];
      if (firstCall.data === "0x") {
        return firstCall.value;
      } else {
        const [, amount] = decodeERC20TransferParams(firstCall.data);
        return amount.toString();
      }
    }

    case "solana-vm": {
      return decodedWithdrawal.withdrawal.amount;
    }

    case "sui-vm": {
      return decodedWithdrawal.withdrawal.amount;
    }

    case "bitcoin-vm": {
      const psbt = bitcoin.Psbt.fromHex(decodedWithdrawal.withdrawal.psbt);
      return psbt.txOutputs[0].value.toString();
    }

    case "hyperliquid-vm": {
      // The assumption here is that the amount is always encoded with the full decimals of the currency
      const decimals =
        decodedWithdrawal.withdrawal.parameters.amount.split(".")[1].length;
      return parseUnits(
        decodedWithdrawal.withdrawal.parameters.amount,
        decimals
      ).toString();
    }

    default:
      throw new Error("Unsupported vm type");
  }
};

export const getDecodedWithdrawalRecipient = (
  decodedWithdrawal: DecodedWithdrawal
): string => {
  switch (decodedWithdrawal.vmType) {
    case "ethereum-vm": {
      const firstCall = decodedWithdrawal.withdrawal.calls[0];
      if (firstCall.data === "0x") {
        return firstCall.to;
      } else {
        const [to] = decodeERC20TransferParams(firstCall.data);
        return to;
      }
    }

    case "tron-vm": {
      const firstCall = decodedWithdrawal.withdrawal.calls[0];
      if (firstCall.data === "0x") {
        return firstCall.to;
      } else {
        const [to] = decodeERC20TransferParams(firstCall.data);
        return to;
      }
    }

    case "solana-vm": {
      return decodedWithdrawal.withdrawal.recipient;
    }

    case "sui-vm": {
      return decodedWithdrawal.withdrawal.recipient;
    }

    case "bitcoin-vm": {
      const psbt = bitcoin.Psbt.fromHex(decodedWithdrawal.withdrawal.psbt);
      const firstOutput = psbt.txOutputs[0];
      return bitcoin.address.fromOutputScript(firstOutput.script);
    }

    case "hyperliquid-vm": {
      return decodedWithdrawal.withdrawal.parameters.destination;
    }

    default:
      throw new Error("Unsupported vm type");
  }
};
