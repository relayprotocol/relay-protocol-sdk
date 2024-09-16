import { Interface, JsonRpcProvider, Log } from "ethers";
import invariant from "tiny-invariant";

import { CallTrace, getTrace } from "./trace";
import {
  CommitmentValidator,
  ParseInputResult,
  ParseOutputResult,
} from "../../index";
import { ChainVmType, chains } from "../../../chains";
import { Commitment, EvmCall, getCommitmentId } from "../../../commitment";

const NATIVE_CURRENCY = "0x0000000000000000000000000000000000000000";

const iface = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Relay(bytes32 commitmentId)",
]);

const TRANSFER_TOPIC = iface.getEvent("Transfer")!.topicHash;
const RELAY_TOPIC = iface.getEvent("Relay")!.topicHash;

const extractAllCalls = (trace: CallTrace): EvmCall[] => {
  // Skip reverted calls
  if (trace.error) {
    return [];
  }

  // Skip view / statis calls
  if (trace.type === "staticcall") {
    return [];
  }

  const results: EvmCall[] = [
    {
      from: trace.from,
      to: trace.to,
      data: trace.input,
      value: trace.value ?? "0",
    },
  ];
  for (const c of trace.calls ?? []) {
    results.push(...extractAllCalls(c));
  }

  return results;
};

const getTotalNativePaymentTo = (trace: CallTrace, to: string): bigint => {
  // Skip reverted calls
  if (trace.error) {
    return 0n;
  }

  // Skip view / statis calls
  if (trace.type === "staticcall") {
    return 0n;
  }

  let amount = 0n;
  if (trace.to.toLowerCase() === to.toLowerCase()) {
    amount = BigInt(trace.value ?? 0n);
  }

  // Search recursively through all calls
  for (const c of trace.calls ?? []) {
    amount += getTotalNativePaymentTo(c, to);
  }

  return amount;
};

const getTotalERC20PaymentTo = (
  logs: readonly Log[],
  currency: string,
  to: string
): bigint =>
  logs.reduce((amount, log) => {
    if (
      log.topics[0] === TRANSFER_TOPIC &&
      log.address.toLowerCase() === currency.toLowerCase()
    ) {
      try {
        const decodedData = iface.parseLog(log);
        if (!decodedData) {
          return amount;
        }

        if (
          (decodedData.args["to"] as string).toLowerCase() === to.toLowerCase()
        ) {
          return (amount + decodedData.args["value"]) as bigint;
        }
      } catch {
        return amount;
      }
    }

    return amount;
  }, 0n);

const getCommitmentIdLogs = (logs: readonly Log[]) =>
  logs.filter((log) => log.topics[0] === RELAY_TOPIC);

export class EvmCommitmentValidator extends CommitmentValidator {
  public async parseInput({
    commitment,
    inputIndex,
    transactionId,
  }: {
    commitment: Commitment;
    inputIndex: number;
    transactionId: string;
  }): Promise<ParseInputResult> {
    const input = commitment.inputs[inputIndex];
    invariant(input, "Expected defined input");

    const chainData = chains[input.chain];
    invariant(chainData.vmType === ChainVmType.Evm, "Expected evm chain");

    const rpc = new JsonRpcProvider(chainData.rpcUrl);

    // Ensure we can retrieve the transaction response
    const tx = await rpc.getTransaction(transactionId);
    if (!tx) {
      return {
        status: "failure",
        reason: "Missing transaction response",
      };
    }

    // Ensure we can retrieve the transaction receipt
    const txReceipt = await rpc.getTransactionReceipt(transactionId);
    if (!txReceipt) {
      return {
        status: "failure",
        reason: "Missing transaction receipt",
      };
    }

    // Ensure the transaction is not reverted
    if (txReceipt.status !== 1) {
      return {
        status: "failure",
        reason: "Transaction was reverted",
      };
    }

    // Parse the commitment id from the transaction data
    let commitmentId: string;

    const commitmentIdLogs = getCommitmentIdLogs(txReceipt.logs);
    if (commitmentIdLogs.length > 1) {
      // For now, we only support a single input payment per transaction
      return {
        status: "failure",
        reason: "More than one commitment id in the transaction",
      };
    } else if (commitmentIdLogs.length === 1) {
      // Extract the commitment id from the log data
      commitmentId = commitmentIdLogs[0].data;
    } else {
      if (tx.data.length < 2 + 32 * 2) {
        return {
          status: "failure",
          reason: "Could not parse request id from end of calldata",
        };
      }

      // Extract the commitment id from the calldata
      commitmentId = "0x" + tx.data.slice(-32);
    }

    // Ensure the parsed commitment id matches the commitment id to validate
    if (commitmentId !== getCommitmentId(commitment)) {
      return {
        status: "failure",
        reason: "Incorrect commitment id to verify",
      };
    }

    // Get the amount that was paid (based on the input payment data)
    const amountPaid =
      input.payment.currency === NATIVE_CURRENCY
        ? getTotalNativePaymentTo(
            await getTrace(rpc, transactionId),
            input.payment.to
          )
        : getTotalERC20PaymentTo(
            txReceipt.logs,
            input.payment.currency,
            input.payment.to
          );

    return {
      status: "success",
      amountPaid: amountPaid.toString(),
    };
  }

  public async parseOutput({
    commitment,
    transactionId,
  }: {
    commitment: Commitment;
    transactionId: string;
  }): Promise<ParseOutputResult> {
    const output = commitment.output;

    const chainData = chains[output.chain];
    invariant(chainData.vmType === ChainVmType.Evm, "Expected evm chain");

    const rpc = new JsonRpcProvider(chainData.rpcUrl);

    // Ensure we can retrieve the transaction response
    const tx = await rpc.getTransaction(transactionId);
    if (!tx) {
      return {
        status: "failure",
        reason: "Missing transaction response",
      };
    }

    // Ensure we can retrieve the transaction receipt
    const txReceipt = await rpc.getTransactionReceipt(transactionId);
    if (!txReceipt) {
      return {
        status: "failure",
        reason: "Missing transaction receipt",
      };
    }

    // Ensure the transaction is not reverted
    if (txReceipt.status !== 1) {
      return {
        status: "failure",
        reason: "Transaction was reverted",
      };
    }

    // Extract the commitment id from the calldata
    if (tx.data.length < 2 + 32 * 2) {
      return {
        status: "failure",
        reason: "Could not parse request id from end of calldata",
      };
    }
    const commitmentId = "0x" + tx.data.slice(-32);

    // Ensure the parsed commitment id matches the commitment id to validate
    if (commitmentId !== getCommitmentId(commitment)) {
      return {
        status: "failure",
        reason: "Incorrect commitment id to verify",
      };
    }

    // Utility to avoid more than one tracing calls
    let trace: CallTrace | undefined;
    const getTraceWithCache = async () => {
      if (!trace) {
        trace = await getTrace(rpc, transactionId);
      }
      return trace;
    };

    // Get the amount that was paid (based on the output payment data)
    const amountPaid =
      output.payment.currency === NATIVE_CURRENCY
        ? getTotalNativePaymentTo(await getTraceWithCache(), output.payment.to)
        : getTotalERC20PaymentTo(
            txReceipt.logs,
            output.payment.currency,
            output.payment.to
          );

    let callsExecuted = true;

    // Extract all successful calls from the trace
    const calls = extractAllCalls(await getTraceWithCache());

    // Iterate through all the calls and ensure the expected calls are all included
    const usedIndexes: number[] = [];
    for (const expectedCall of output.calls ?? []) {
      const foundIndex = calls.findIndex(
        (c, i) =>
          !usedIndexes.includes(i) &&
          c.from.toLowerCase() === expectedCall.data.from.toLowerCase() &&
          c.to.toLowerCase() === expectedCall.data.to.toLowerCase() &&
          c.data === expectedCall.data.data &&
          BigInt(c.value) >= BigInt(expectedCall.data.value)
      );
      if (foundIndex === -1) {
        callsExecuted = false;
        break;
      }

      usedIndexes.push(foundIndex);
    }

    return {
      status: "success",
      amountPaid: amountPaid.toString(),
      callsExecuted,
    };
  }
}
