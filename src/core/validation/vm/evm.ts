import { Interface, JsonRpcProvider } from "ethers";
import invariant from "tiny-invariant";

import { Chain, chains } from "../../chains";
import { UserPayment } from "../../types";

const NATIVE_CURRENCY = "0x0000000000000000000000000000000000000000";

const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

type CallType = "call" | "staticcall" | "delegatecall";

export interface CallTrace {
  type: CallType;
  from: string;
  to: string;
  input: string;
  output: string;
  value?: string;
  error?: string;
  calls?: CallTrace[];
}

const normalizeTrace = (trace: CallTrace) => {
  trace.type = trace.type.toLowerCase() as CallType;
  for (const call of trace.calls ?? []) {
    normalizeTrace(call);
  }
  return trace;
};

export const getTrace = async (rpc: JsonRpcProvider, transactionId: string) =>
  rpc
    ._send({
      method: "debug_traceTransaction",
      params: [transactionId, { tracer: "callTracer" }],
      jsonrpc: "2.0",
      id: 1,
    })
    .then((results) => normalizeTrace(results[0].result));

export const validateUserPayment = async (
  chain: Chain,
  payment: UserPayment,
  transactionId: string
): Promise<boolean> => {
  const chainData = chains[chain];

  invariant(chainData.vmType === "evm", "Unsupported chain vm");

  const rpc = new JsonRpcProvider(chains[chain].rpcUrl);
  if (payment.currency === NATIVE_CURRENCY) {
    // Use the transaction trace for validating the payment

    const tx = await rpc.getTransaction(transactionId);
    if (!tx) {
      return false;
    }

    if (
      tx.to?.toLowerCase() === payment.to.toLowerCase() &&
      tx.value >= BigInt(payment.amount)
    ) {
      return true;
    } else {
      const findInTrace = (trace: CallTrace) => {
        if (trace.error) {
          return false;
        }

        if (trace.type === "staticcall") {
          return false;
        }

        if (
          trace.to.toLowerCase() === payment.to.toLowerCase() &&
          BigInt(trace.value ?? 0n) >= BigInt(payment.amount)
        ) {
          return true;
        }

        for (const c of trace.calls ?? []) {
          if (findInTrace(c)) {
            return true;
          }
        }

        return false;
      };

      return findInTrace(await getTrace(rpc, transactionId));
    }
  } else {
    // Use the transaction logs for validating the payment

    const receipt = await rpc.getTransactionReceipt(transactionId);
    if (!receipt) {
      return false;
    }

    return Boolean(
      receipt.logs.find((log) => {
        if (
          log.topics[0] === ERC20_TRANSFER_TOPIC &&
          log.address.toLowerCase() === payment.currency.toLowerCase()
        ) {
          try {
            const decodedData = new Interface([
              "event Transfer (address indexed from, address indexed to, uint256 value)",
            ]).parseLog(log);
            if (!decodedData) {
              return false;
            }

            if (
              (decodedData.args["to"] as string).toLowerCase() ===
                payment.to.toLowerCase() &&
              (decodedData.args["value"] as bigint) >= BigInt(payment.amount)
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
  }
};
