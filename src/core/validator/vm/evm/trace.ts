import { JsonRpcProvider } from "ethers";

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
  // Some RPCs might return uppercased types so here we normalize to lowercase
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
