import { Interface, JsonRpcProvider, Log } from "ethers";
import invariant from "tiny-invariant";

import { CallTrace, getTrace } from "./trace";
import { ChainVmType, chains } from "../../../chains";
import { Commitment, getCommitmentId } from "../../../commitment";

const NATIVE_CURRENCY = "0x0000000000000000000000000000000000000000";

const iface = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Relay(bytes32 commitmentId)",
]);

const TRANSFER_TOPIC = iface.getEvent("Transfer")!.topicHash;
const RELAY_TOPIC = iface.getEvent("Relay")!.topicHash;

// Helper methods

const findNativePaymentInTrace = (
  trace: CallTrace,
  to: string,
  amount: string
) => {
  // Skip reverted calls
  if (trace.error) {
    return false;
  }

  // Skip view / statis calls
  if (trace.type === "staticcall") {
    return false;
  }

  if (trace.to.toLowerCase() === to.toLowerCase()) {
    return BigInt(trace.value ?? 0n) >= BigInt(amount);
  }

  // Search recursively through all calls
  for (const c of trace.calls ?? []) {
    if (findNativePaymentInTrace(c, to, amount)) {
      return true;
    }
  }

  return false;
};

const findERC20PaymentInLogs = (
  logs: readonly Log[],
  currency: string,
  to: string,
  amount: string
) => {
  return Boolean(
    logs.find((log) => {
      if (
        log.topics[0] === TRANSFER_TOPIC &&
        log.address.toLowerCase() === currency.toLowerCase()
      ) {
        try {
          const decodedData = iface.parseLog(log);
          if (!decodedData) {
            return false;
          }

          if (
            (decodedData.args["to"] as string).toLowerCase() ===
              to.toLowerCase() &&
            (decodedData.args["value"] as bigint) >= BigInt(amount)
          ) {
            return true;
          }
        } catch {
          return false;
        }
      }

      return false;
    })
  );
};

const findCommitmentIdInLogs = (logs: readonly Log[], commitmentId: string) => {
  // Ensure there is a single "Relay" event
  const matchingLogs = logs.filter((log) => log.topics[0] === RELAY_TOPIC);
  if (matchingLogs.length !== 1) {
    return false;
  }

  return matchingLogs[0].data === commitmentId;
};

export const validateUserPayment = async ({
  commitment,
  originIndex,
  transactionId,
}: {
  commitment: Commitment;
  originIndex: number;
  transactionId: string;
}): Promise<boolean> => {
  const origin = commitment.origins[originIndex];
  invariant(originIndex, "Invalid origin index");

  const chainData = chains[origin.chain];
  invariant(chainData.vmType === ChainVmType.Evm, "Unsupported chain vm");

  const commitmentId = getCommitmentId(commitment);
  const payment = origin.payment;

  const rpc = new JsonRpcProvider(chainData.rpcUrl);
  if (payment.currency === NATIVE_CURRENCY) {
    // Handle native currency payments

    const tx = await rpc.getTransaction(transactionId);
    if (!tx) {
      return false;
    }

    if (tx.to?.toLowerCase() === payment.to.toLowerCase()) {
      // Fast case: direct payment

      return (
        // Find the payment
        tx.value >= BigInt(payment.amount) &&
        // Find the commitment id reference (expected to be at the end of the calldata)
        tx.data.endsWith(commitmentId.slice(2))
      );
    } else {
      // Slow case: internal payment

      const txReceipt = await rpc.getTransactionReceipt(transactionId);
      if (!txReceipt) {
        return false;
      }

      return (
        // Find the payment
        findNativePaymentInTrace(
          await getTrace(rpc, transactionId),
          payment.to,
          payment.amount
        ) &&
        // Find the commitment id reference
        findCommitmentIdInLogs(txReceipt.logs, commitmentId)
      );
    }
  } else {
    // Handle ERC20 token payments

    const txReceipt = await rpc.getTransactionReceipt(transactionId);
    if (!txReceipt) {
      return false;
    }

    if (txReceipt.to?.toLowerCase() === payment.currency.toLowerCase()) {
      // Fast case: direct payment

      const tx = await rpc.getTransaction(transactionId);
      if (!tx) {
        return false;
      }

      return (
        // Find the payment
        findERC20PaymentInLogs(
          txReceipt.logs,
          payment.currency,
          payment.to,
          payment.amount
        ) &&
        // Find the commitment id reference (expected to be at the end of the calldata)
        tx.data.endsWith(commitmentId.slice(2))
      );
    } else {
      return (
        // Find the payment
        findERC20PaymentInLogs(
          txReceipt.logs,
          payment.currency,
          payment.to,
          payment.amount
        ) &&
        // Find the commitment id reference
        findCommitmentIdInLogs(txReceipt.logs, commitmentId)
      );
    }
  }
};
