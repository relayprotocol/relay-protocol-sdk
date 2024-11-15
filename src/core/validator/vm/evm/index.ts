import { Interface, JsonRpcProvider, Log } from "ethers";

import { CallTrace, getTrace } from "./trace";
import { CommonFailureReason } from "../common";
import {
  ChainConfig,
  CommitmentValidator,
  Status,
  ValidationResult,
} from "../../types";
import {
  COMMITMENT_ID_LENGTH_IN_BYTES,
  CallEvm,
  ChainVmType,
  Commitment,
  getCommitmentId,
} from "../../../commitment";

const NATIVE_CURRENCY = "0x0000000000000000000000000000000000000000";

const iface = new Interface([
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event RelayDeposit(bytes32 indexed commitmentId, address indexed to, address indexed currency, uint256 amount)",
  // Methods
  "function transfer(address to, uint256 amount)",
  "function transferFrom(address from, address to, uint256 amount)",
  `function transferWithAuthorization(
    address from,
    address to,
    uint256 amount,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    bytes signature
  )`,
]);

const TRANSFER_TOPIC = iface.getEvent("Transfer")!.topicHash;
const RELAY_DEPOSIT_TOPIC = iface.getEvent("RelayDeposit")!.topicHash;

const getTransferLogs = (logs: readonly Log[]) =>
  logs.filter((log) => log.topics[0] === TRANSFER_TOPIC);

const getRelayDepositLogs = (logs: readonly Log[]) =>
  logs.filter((log) => log.topics[0] === RELAY_DEPOSIT_TOPIC);

const extractAllCalls = (trace: CallTrace): CallEvm[] => {
  // Skip reverted calls
  if (trace.error) {
    return [];
  }

  // Skip view / statis calls
  if (trace.type === "staticcall") {
    return [];
  }

  const results: CallEvm[] = [
    {
      from: trace.from,
      to: trace.to,
      data: trace.input,
      value: BigInt(trace.value ?? "0"),
    },
  ];
  for (const c of trace.calls ?? []) {
    results.push(...extractAllCalls(c));
  }

  return results;
};

enum EvmFailureReason {
  MISSING_TRANSACTION_RECEIPT = "MISSING_TRANSACTION_RECEIPT",
  MISSING_TRANSACTION_RESPONSE = "MISSING_TRANSACTION_RESPONSE",
  TRANSACTION_REVERTED = "TRANSACTION_REVERTED",
}

export class EvmCommitmentValidator extends CommitmentValidator {
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
        reason: CommonFailureReason.INVALID_INPUT,
      };
    }

    // Ensure the chain exists and has the right vm type
    const chainData = chainConfigs[input.chain];
    if (!chainData) {
      return {
        status: Status.FAILURE,
        reason: CommonFailureReason.UNSUPPORTED_CHAIN,
      };
    }
    if (chainData.vmType !== ChainVmType.EVM) {
      return {
        status: Status.FAILURE,
        reason: CommonFailureReason.WRONG_VM_TYPE,
      };
    }

    const rpc = new JsonRpcProvider(chainData.rpcUrl);

    // Ensure we can retrieve the transaction response
    const tx = await rpc.getTransaction(transactionId);
    if (!tx) {
      return {
        status: Status.FAILURE,
        reason: EvmFailureReason.MISSING_TRANSACTION_RESPONSE,
      };
    }

    // Ensure we can retrieve the transaction receipt
    const txReceipt = await rpc.getTransactionReceipt(transactionId);
    if (!txReceipt) {
      return {
        status: Status.FAILURE,
        reason: EvmFailureReason.MISSING_TRANSACTION_RECEIPT,
      };
    }

    // Ensure the transaction is not reverted
    if (txReceipt.status !== 1) {
      return {
        status: Status.FAILURE,
        reason: EvmFailureReason.TRANSACTION_REVERTED,
      };
    }

    // Get the commitment id
    const commitmentId = getCommitmentId(commitment);

    // Case 1: direct native payment
    if (input.payment.to.toLowerCase() === tx.to?.toLowerCase()) {
      // Checks:
      // - the commitment input payment currency must be the native currency
      // - the commitment id must match the transaction data
      if (
        input.payment.currency.toLowerCase() === NATIVE_CURRENCY &&
        commitmentId === tx.data
      ) {
        return {
          status: Status.SUCCESS,
          amount: tx.value,
        };
      }

      return {
        status: Status.FAILURE,
        reason: CommonFailureReason.NON_MATCHING_TRANSACTION,
      };
    }

    // Case 2: direct erc20 payment
    if (input.payment.currency.toLowerCase() === tx.to?.toLowerCase()) {
      const decoded = iface.parseTransaction(tx);
      switch (decoded?.name) {
        case "transfer":
        case "transferFrom":
        case "transferWithAuthorization": {
          const recipient = decoded.args.to as string;
          const amount = decoded.args.amount as bigint;

          // Checks:
          // - the transfer recipient must match the commitment input payment recipient
          // - the commitment id must be at the end of the transaction data
          if (
            input.payment.to.toLowerCase() === recipient.toLowerCase() &&
            commitmentId ===
              "0x" + tx.data.slice(-COMMITMENT_ID_LENGTH_IN_BYTES * 2)
          ) {
            return {
              status: Status.SUCCESS,
              amount,
            };
          }

          break;
        }
      }

      return {
        status: Status.FAILURE,
        reason: CommonFailureReason.NON_MATCHING_TRANSACTION,
      };
    }

    // Case 3: contract payment
    for (const log of getRelayDepositLogs(txReceipt.logs)) {
      const decoded = iface.parseLog(log);

      // TODO: Check the deposit contract that's being used and enforce it matches the one specific in the commitment data

      // Checks:
      // - the deposit log recipient must match the commitment input payment recipient
      // - the deposit log currency must match the commitment input payment currency
      // - the deposit log commitment id must match the current commitment id
      if (
        decoded &&
        input.payment.to.toLowerCase() === decoded.args.to.toLowerCase() &&
        input.payment.currency.toLowerCase() ===
          decoded.args.currency.toLowerCase() &&
        commitmentId === decoded.args.commitmentId.toLowerCase()
      ) {
        return {
          status: Status.SUCCESS,
          amount: decoded.args.amount.toString(),
        };
      }
    }

    return {
      status: Status.FAILURE,
      reason: CommonFailureReason.NON_MATCHING_TRANSACTION,
    };
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
        reason: CommonFailureReason.UNSUPPORTED_CHAIN,
      };
    }
    if (chainData.vmType !== ChainVmType.EVM) {
      return {
        status: Status.FAILURE,
        reason: CommonFailureReason.WRONG_VM_TYPE,
      };
    }

    const rpc = new JsonRpcProvider(chainData.rpcUrl);

    // Ensure we can retrieve the transaction response
    const tx = await rpc.getTransaction(transactionId);
    if (!tx) {
      return {
        status: Status.FAILURE,
        reason: EvmFailureReason.MISSING_TRANSACTION_RESPONSE,
      };
    }

    // Ensure we can retrieve the transaction receipt
    const txReceipt = await rpc.getTransactionReceipt(transactionId);
    if (!txReceipt) {
      return {
        status: Status.FAILURE,
        reason: EvmFailureReason.MISSING_TRANSACTION_RECEIPT,
      };
    }

    // Ensure the transaction is not reverted
    if (txReceipt.status !== 1) {
      return {
        status: Status.FAILURE,
        reason: EvmFailureReason.TRANSACTION_REVERTED,
      };
    }

    // Get the commitment id
    const commitmentId = getCommitmentId(commitment);

    // Checks:
    // - the commitment id must be at the end of the transaction data
    if (
      commitmentId !==
      "0x" + tx.data.slice(-COMMITMENT_ID_LENGTH_IN_BYTES * 2)
    )
      if (commitmentId !== getCommitmentId(commitment)) {
        return {
          status: Status.FAILURE,
          reason: CommonFailureReason.NON_MATCHING_TRANSACTION,
        };
      }

    // Utility to avoid making more than one tracing call
    let txCalls: CallEvm[] | undefined;
    const getCallsWithCache = async () => {
      if (!txCalls) {
        const trace = await getTrace(rpc, transactionId);
        txCalls = extractAllCalls(trace);
      }
      return txCalls;
    };

    // Keep track of call indexes which were already processed
    const processedTxCallIndexes: number[] = [];

    // Parse the payment amount
    let amount: bigint | undefined;
    if (output.payment.currency.toLowerCase() === NATIVE_CURRENCY) {
      // Case 1: native currency

      if (tx.to?.toLowerCase() === output.payment.to.toLowerCase()) {
        // Case 1: direct payment

        amount = tx.value;
      } else {
        // Case 2: internal payment

        const calls = await getCallsWithCache();
        for (let i = 0; i < calls.length; i++) {
          const call = calls[i];
          if (call.to.toLowerCase() === output.payment.to.toLowerCase()) {
            amount = call.value;

            // Mark the current index as being processed
            processedTxCallIndexes.push(i);

            break;
          }
        }
      }
    } else {
      // Case 2: erc20 payment

      for (const log of getTransferLogs(txReceipt.logs)) {
        const decoded = iface.parseLog(log);

        if (
          decoded &&
          log.address.toLowerCase() === output.payment.currency.toLowerCase() &&
          decoded.args.to.toLowerCase() === output.payment.to.toLowerCase()
        ) {
          amount = decoded.args.value.toString();
        }
      }
    }

    // Checks:
    // - the output payment was successfully sent
    if (!amount) {
      return {
        status: Status.FAILURE,
        reason: CommonFailureReason.NON_MATCHING_TRANSACTION,
      };
    }

    // Checks:
    // - ensure all output calls were executed in the correct order
    const outputCalls = output.calls;
    if (outputCalls.length) {
      for (const outputCall of outputCalls) {
        if (!(outputCall instanceof CallEvm)) {
          return {
            status: Status.FAILURE,
            reason: CommonFailureReason.INVALID_OUTPUT_CALL,
          };
        }

        const txCalls = await getCallsWithCache();

        const lastProcessedTxCallIndex = processedTxCallIndexes.length
          ? processedTxCallIndexes[processedTxCallIndexes.length - 1]
          : -1;
        for (let i = lastProcessedTxCallIndex + 1; i < txCalls.length; i++) {
          const txCall = txCalls[i];
          if (
            txCall.from.toLowerCase() === outputCall.from.toLowerCase() &&
            txCall.to.toLowerCase() === outputCall.to.toLowerCase() &&
            txCall.data === outputCall.data &&
            txCall.value === outputCall.value
          ) {
            processedTxCallIndexes.push(i);
            continue;
          }
        }

        return {
          status: Status.FAILURE,
          reason: CommonFailureReason.OUTPUT_CALLS_NOT_EXECUTED,
        };
      }
    }

    return {
      status: Status.SUCCESS,
      amount,
    };
  }
}
