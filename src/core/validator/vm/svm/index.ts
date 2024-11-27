import { MEMO_PROGRAM_ID } from "@solana/spl-memo";
import { Connection } from "@solana/web3.js";
import bs58 from "bs58";

import {
  ChainConfig,
  CommitmentValidator,
  Side,
  Status,
  ValidationResult,
} from "../../types";
import { ChainVmType, Commitment } from "../../../commitment";

const NATIVE_CURRENCY = "11111111111111111111111111111111";

enum ErrorReason {
  INPUT_DOES_NOT_EXIST = "INPUT_DOES_NOT_EXIST",
  UNSUPPORTED_CHAIN = "UNSUPPORTED_CHAIN",
  WRONG_CHAIN_VM_TYPE = "WRONG_CHAIN_VM_TYPE",
  MISSING_TRANSACTION = "MISSING_TRANSACTION",
  TRANSACTION_REVERTED = "TRANSACTION_REVERTED",
  NO_MEMO_INSTRUCTION_DETECTED = "NO_MEMO_INSTRUCTION_DETECTED",
  MULTIPLE_MEMO_INSTRUCTIONS_DETECTED = "MULTIPLE_MEMO_INSTRUCTIONS_DETECTED",
  WRONG_MEMO_INSTRUCTION = "WRONG_MEMO_INSTRUCTION",
  NATIVE_PAYMENT_MISMATCH = "NATIVE_PAYMENT_MISMATCH",
  SPL_TOKEN_PAYMENT_MISMATCH = "SPL_TOKEN_PAYMENT_MISMATCH",
  MISSING_TRANSACTION_TIMESTAMP = "MISSING_TRANSACTION_TIMESTAMP",
  DEADLINE_EXCEEDED = "DEADLINE_EXCEEDED",
}

export class SvmCommitmentValidator extends CommitmentValidator {
  public async validateInput({
    chainConfigs,
    commitment,
    inputIndex,
    transactionId,
  }: {
    chainConfigs: Record<string, ChainConfig>;
    commitment: Commitment;
    inputIndex: number;
    transactionId: string;
  }): Promise<ValidationResult> {
    // Ensure the input exists
    const input = commitment.inputs[inputIndex];
    if (!input) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.INPUT_DOES_NOT_EXIST,
          side: Side.INPUT,
          commitment,
          inputIndex,
          chainConfigs,
        },
      };
    }

    // Ensure the chain exists and has the right vm type
    const chainData = chainConfigs[input.chain];
    if (!chainData) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.UNSUPPORTED_CHAIN,
          side: Side.INPUT,
          commitment,
          inputIndex,
          chainConfigs,
        },
      };
    }
    if (chainData.vmType !== ChainVmType.SVM) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.WRONG_CHAIN_VM_TYPE,
          side: Side.INPUT,
          commitment,
          inputIndex,
          chainConfigs,
        },
      };
    }

    const rpc = new Connection(chainData.rpcUrl, { commitment: "confirmed" });

    // Ensure we can retrieve the transaction
    const tx = await rpc
      .getTransaction(transactionId, {
        maxSupportedTransactionVersion: 0,
      })
      .catch(() => undefined);
    if (!tx) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.MISSING_TRANSACTION,
          side: Side.INPUT,
          commitment,
          inputIndex,
          chainConfigs,
          transactionId,
        },
      };
    }

    // Ensure the transaction is not reverted
    if (tx.meta?.err) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.TRANSACTION_REVERTED,
          side: Side.INPUT,
          commitment,
          inputIndex,
          chainConfigs,
          transactionId,
        },
      };
    }

    const txTimestamp = tx.blockTime;
    if (!txTimestamp) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.MISSING_TRANSACTION_TIMESTAMP,
          side: Side.INPUT,
          commitment,
          inputIndex,
          chainConfigs,
          transactionId,
        },
      };
    }

    // Checks:
    // - the input payment was sent on time
    if (txTimestamp > commitment.deadline) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.DEADLINE_EXCEEDED,
          side: Side.INPUT,
          commitment,
          inputIndex,
          chainConfigs,
          transactionId,
        },
      };
    }

    // Get all relevant account keys
    const accountKeys = [
      ...tx.transaction.message.getAccountKeys({
        addressLookupTableAccounts: await Promise.all(
          (tx.transaction.message.addressTableLookups ?? []).map(
            async ({ accountKey }) =>
              await rpc
                .getAddressLookupTable(accountKey)
                .then((res) => res.value!)
          )
        ),
      }).staticAccountKeys,
      // First we have `writable` and then `readonly`
      ...(tx.meta?.loadedAddresses?.writable ?? []),
      ...(tx.meta?.loadedAddresses?.readonly ?? []),
    ];

    // Get all relevant instructions
    const message = tx.transaction.message;
    const instructions = [
      ...message.compiledInstructions,
      // Include any inner instructions
      ...(tx.meta?.innerInstructions ?? [])
        .map((i) => i.instructions)
        .flat()
        .map((i) => ({
          accountKeyIndexes: i.accounts,
          programIdIndex: i.programIdIndex,
          data: bs58.decode(i.data),
        })),
    ];

    // Checks:
    // - there should be a single memo instruction matching the commitment id

    const memoInstructions = instructions.filter(
      (i) => accountKeys[i.programIdIndex] === MEMO_PROGRAM_ID
    );
    if (!memoInstructions.length) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.NO_MEMO_INSTRUCTION_DETECTED,
          side: Side.INPUT,
          commitment,
          inputIndex,
          chainConfigs,
          transactionId,
        },
      };
    }
    if (memoInstructions.length > 1) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.MULTIPLE_MEMO_INSTRUCTIONS_DETECTED,
          side: Side.INPUT,
          commitment,
          inputIndex,
          chainConfigs,
          transactionId,
        },
      };
    }
    if (Buffer.from(memoInstructions[0].data).toString() !== commitment.id) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.WRONG_MEMO_INSTRUCTION,
          side: Side.INPUT,
          commitment,
          inputIndex,
          chainConfigs,
          transactionId,
        },
      };
    }

    if (input.payment.currency === NATIVE_CURRENCY) {
      // Case 1: native payment

      const toIndex = accountKeys.findIndex(
        (key) => key.toBase58() === input.payment.to
      );
      if (toIndex) {
        const preBalance = tx.meta?.preBalances[toIndex];
        const postBalance = tx.meta?.postBalances[toIndex];
        if (preBalance && postBalance) {
          const amount = BigInt(postBalance) - BigInt(preBalance);
          if (amount > 0n) {
            return {
              status: Status.SUCCESS,
              amount,
            };
          }
        }
      }

      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.NATIVE_PAYMENT_MISMATCH,
          side: Side.INPUT,
          commitment,
          inputIndex,
          chainConfigs,
          transactionId,
        },
      };
    } else {
      // Case 2: spl-token payment

      const preBalance = tx.meta?.preTokenBalances?.find(
        (b) => b.mint === input.payment.currency && b.owner === input.payment.to
      );
      const postBalance = tx.meta?.postTokenBalances?.find(
        (b) => b.mint === input.payment.currency && b.owner === input.payment.to
      );
      if (preBalance && postBalance) {
        const amount =
          BigInt(postBalance.uiTokenAmount.amount) -
          BigInt(preBalance.uiTokenAmount.amount);
        if (amount > 0n) {
          return {
            status: Status.SUCCESS,
            amount,
          };
        }
      }

      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.SPL_TOKEN_PAYMENT_MISMATCH,
          side: Side.INPUT,
          commitment,
          inputIndex,
          chainConfigs,
          transactionId,
        },
      };
    }
  }

  public async validateOutput({
    chainConfigs,
    commitment,
    transactionId,
  }: {
    chainConfigs: Record<string, ChainConfig>;
    commitment: Commitment;
    transactionId: string;
  }): Promise<ValidationResult> {
    const output = commitment.output;

    // Ensure the chain exists and has the right vm type
    const chainData = chainConfigs[output.chain];
    if (!chainData) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.UNSUPPORTED_CHAIN,
          side: Side.OUTPUT,
          commitment,
          chainConfigs,
        },
      };
    }
    if (chainData.vmType !== ChainVmType.SVM) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.WRONG_CHAIN_VM_TYPE,
          side: Side.OUTPUT,
          commitment,
          chainConfigs,
        },
      };
    }

    const rpc = new Connection(chainData.rpcUrl, { commitment: "confirmed" });

    // Ensure we can retrieve the transaction
    const tx = await rpc
      .getTransaction(transactionId, {
        maxSupportedTransactionVersion: 0,
      })
      .catch(() => undefined);
    if (!tx) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.MISSING_TRANSACTION,
          side: Side.OUTPUT,
          commitment,
          chainConfigs,
          transactionId,
        },
      };
    }

    // Ensure the transaction is not reverted
    if (tx.meta?.err) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.TRANSACTION_REVERTED,
          side: Side.OUTPUT,
          commitment,
          chainConfigs,
          transactionId,
        },
      };
    }

    // Get all relevant account keys
    const accountKeys = [
      ...tx.transaction.message.getAccountKeys({
        addressLookupTableAccounts: await Promise.all(
          (tx.transaction.message.addressTableLookups ?? []).map(
            async ({ accountKey }) =>
              await rpc
                .getAddressLookupTable(accountKey)
                .then((res) => res.value!)
          )
        ),
      }).staticAccountKeys,
      // First we have `writable` and then `readonly`
      ...(tx.meta?.loadedAddresses?.writable ?? []),
      ...(tx.meta?.loadedAddresses?.readonly ?? []),
    ];

    // Get all relevant instructions
    const message = tx.transaction.message;
    const instructions = [
      ...message.compiledInstructions,
      // Include any inner instructions
      ...(tx.meta?.innerInstructions ?? [])
        .map((i) => i.instructions)
        .flat()
        .map((i) => ({
          accountKeyIndexes: i.accounts,
          programIdIndex: i.programIdIndex,
          data: bs58.decode(i.data),
        })),
    ];

    // Checks:
    // - there should be a single memo instruction matching the commitment id

    const memoInstructions = instructions.filter(
      (i) => accountKeys[i.programIdIndex] === MEMO_PROGRAM_ID
    );
    if (!memoInstructions.length) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.NO_MEMO_INSTRUCTION_DETECTED,
          side: Side.OUTPUT,
          commitment,
          chainConfigs,
          transactionId,
        },
      };
    }
    if (memoInstructions.length > 1) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.MULTIPLE_MEMO_INSTRUCTIONS_DETECTED,
          side: Side.OUTPUT,
          commitment,
          chainConfigs,
          transactionId,
        },
      };
    }
    if (Buffer.from(memoInstructions[0].data).toString() !== commitment.id) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.WRONG_MEMO_INSTRUCTION,
          side: Side.OUTPUT,
          commitment,
          chainConfigs,
          transactionId,
        },
      };
    }

    if (output.payment.currency === NATIVE_CURRENCY) {
      // Case 1: native payment

      const toIndex = accountKeys.findIndex(
        (key) => key.toBase58() === output.payment.to
      );
      if (toIndex) {
        const preBalance = tx.meta?.preBalances[toIndex];
        const postBalance = tx.meta?.postBalances[toIndex];
        if (preBalance && postBalance) {
          const amount = BigInt(postBalance) - BigInt(preBalance);
          if (amount > 0n) {
            return {
              status: Status.SUCCESS,
              amount,
            };
          }
        }
      }

      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.NATIVE_PAYMENT_MISMATCH,
          side: Side.OUTPUT,
          commitment,
          chainConfigs,
          transactionId,
        },
      };
    } else {
      // Case 2: spl-token payment

      const preBalance = tx.meta?.preTokenBalances?.find(
        (b) =>
          b.mint === output.payment.currency && b.owner === output.payment.to
      );
      const postBalance = tx.meta?.postTokenBalances?.find(
        (b) =>
          b.mint === output.payment.currency && b.owner === output.payment.to
      );
      if (preBalance && postBalance) {
        const amount =
          BigInt(postBalance.uiTokenAmount.amount) -
          BigInt(preBalance.uiTokenAmount.amount);
        if (amount > 0n) {
          return {
            status: Status.SUCCESS,
            amount,
          };
        }
      }

      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.SPL_TOKEN_PAYMENT_MISMATCH,
          side: Side.OUTPUT,
          commitment,
          chainConfigs,
          transactionId,
        },
      };
    }
  }
}
