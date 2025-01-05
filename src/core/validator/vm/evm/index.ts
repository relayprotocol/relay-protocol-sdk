import { ethers, Interface, Log } from "ethers";

import { getRpc } from "./rpc";
import { CallTrace, getTrace } from "./trace";
import {
  ChainConfig,
  CommitmentValidator,
  Side,
  Status,
  ValidationResult,
} from "../../types";
import {
  COMMITMENT_ID_LENGTH_IN_BYTES,
  ChainVmType,
  Commitment,
} from "../../../commitment";

const NATIVE_CURRENCY = "0x0000000000000000000000000000000000000000";

const iface = new Interface([
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
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

const getTransferLogs = (logs: readonly Log[]) =>
  logs.filter((log) => log.topics[0] === TRANSFER_TOPIC);

type CallEvm = {
  from: string;
  to: string;
  data: string;
  value: string;
};

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
      value: BigInt(trace.value ?? "0").toString(),
    },
  ];
  for (const c of trace.calls ?? []) {
    results.push(...extractAllCalls(c));
  }

  return results;
};

enum ErrorReason {
  INPUT_DOES_NOT_EXIST = "INPUT_DOES_NOT_EXIST",
  REFUND_DOES_NOT_EXIST = "REFUND_DOES_NOT_EXIST",
  UNSUPPORTED_CHAIN = "UNSUPPORTED_CHAIN",
  WRONG_CHAIN_VM_TYPE = "WRONG_CHAIN_VM_TYPE",
  MISSING_TRANSACTION_RESPONSE = "MISSING_TRANSACTION_RESPONSE",
  MISSING_TRANSACTION_RECEIPT = "MISSING_TRANSACTION_RECEIPT",
  TRANSACTION_REVERTED = "TRANSACTION_REVERTED",
  DIRECT_NATIVE_PAYMENT_MISMATCH = "DIRECT_NATIVE_PAYMENT_MISMATCH",
  DIRECT_ERC20_PAYMENT_MISMATCH = "DIRECT_ERC20_PAYMENT_MISMATCH",
  CONTRACT_PAYMENT_MISMATCH = "CONTRACT_PAYMENT_MISMATCH",
  COMMITMENT_ID_NOT_AT_END_OF_CALLDATA = "COMMITMENT_ID_NOT_AT_END_OF_CALLDATA",
  COULD_NOT_FIND_PAYMENT = "COULD_NOT_FIND_PAYMENT",
  MISSING_OUTPUT_CALLS = "MISSING_OUTPUT_CALLS",
  MISSING_TRANSACTION_TIMESTAMP = "MISSING_TRANSACTION_TIMESTAMP",
  DEADLINE_EXCEEDED = "DEADLINE_EXCEEDED",
}

export class EvmCommitmentValidator extends CommitmentValidator {
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
    if (chainData.vmType !== ChainVmType.EVM) {
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

    const rpc = getRpc(chainData);

    // Ensure we can retrieve the transaction response
    const tx = await rpc.getTransaction(transactionId);
    if (!tx) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.MISSING_TRANSACTION_RESPONSE,
          side: Side.OUTPUT,
          commitment,
          chainConfigs,
          transactionId,
        },
      };
    }

    // Ensure we can retrieve the transaction receipt
    const txReceipt = await rpc.getTransactionReceipt(transactionId);
    if (!txReceipt) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.MISSING_TRANSACTION_RECEIPT,
          side: Side.OUTPUT,
          commitment,
          chainConfigs,
          transactionId,
        },
      };
    }

    // Ensure the transaction is not reverted
    if (txReceipt.status !== 1) {
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

    // Checks:
    // - the commitment id must be at the end of the transaction data
    if (
      commitment.id !==
      "0x" + tx.data.slice(-COMMITMENT_ID_LENGTH_IN_BYTES * 2)
    ) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.COMMITMENT_ID_NOT_AT_END_OF_CALLDATA,
          side: Side.OUTPUT,
          commitment,
          chainConfigs,
          transactionId,
        },
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
          if (
            call.to.toLowerCase() === output.payment.to.toLowerCase() &&
            BigInt(call.value) > 0
          ) {
            amount = BigInt(call.value);

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
          decoded.args.to.toLowerCase() === output.payment.to.toLowerCase() &&
          BigInt(decoded.args.value) > 0
        ) {
          amount = decoded.args.value.toString();

          break;
        }
      }
    }

    // Checks:
    // - the output payment was successfully sent
    if (!amount) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.COULD_NOT_FIND_PAYMENT,
          side: Side.OUTPUT,
          commitment,
          chainConfigs,
          transactionId,
        },
      };
    }

    // Checks:
    // - ensure all output calls were executed in the correct order
    const outputCalls = output.calls.map((call) => {
      const result = ethers.AbiCoder.defaultAbiCoder().decode(
        ["(address from, address to, bytes data, uint256 value) call"],
        call
      );

      return {
        from: result.call.from.toLowerCase(),
        to: result.call.to.toLowerCase(),
        data: result.call.data,
        value: result.call.value.toString(),
      };
    });
    if (outputCalls.length) {
      let allOutputCallsExecuted = false;

      for (let i = 0; i < outputCalls.length; i++) {
        const outputCall = outputCalls[i];

        const txCalls = await getCallsWithCache();

        const lastProcessedTxCallIndex = processedTxCallIndexes.length
          ? processedTxCallIndexes[processedTxCallIndexes.length - 1]
          : -1;
        for (let j = lastProcessedTxCallIndex + 1; j < txCalls.length; j++) {
          const txCall = txCalls[j];
          if (
            txCall.from.toLowerCase() === outputCall.from.toLowerCase() &&
            txCall.to.toLowerCase() === outputCall.to.toLowerCase() &&
            txCall.data === outputCall.data &&
            BigInt(txCall.value) === BigInt(outputCall.value)
          ) {
            processedTxCallIndexes.push(j);

            // This was the last output call
            if (i === outputCalls.length - 1) {
              allOutputCallsExecuted = true;
            }

            continue;
          }
        }
      }

      if (!allOutputCallsExecuted) {
        return {
          status: Status.FAILURE,
          details: {
            reason: ErrorReason.MISSING_OUTPUT_CALLS,
            side: Side.OUTPUT,
            commitment,
            chainConfigs,
            transactionId,
          },
        };
      }
    }

    return {
      status: Status.SUCCESS,
      amount,
    };
  }

  public async validateRefund({
    chainConfigs,
    commitment,
    inputIndex,
    refundIndex,
    transactionId,
  }: {
    chainConfigs: Record<string, ChainConfig>;
    commitment: Commitment;
    inputIndex: number;
    refundIndex: number;
    transactionId: string;
  }): Promise<ValidationResult> {
    // Ensure the input exists
    const input = commitment.inputs[inputIndex];
    if (!input) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.INPUT_DOES_NOT_EXIST,
          side: Side.REFUND,
          commitment,
          inputIndex,
          refundIndex,
          chainConfigs,
        },
      };
    }

    // Ensure the refund exists
    const refund = input.refunds[refundIndex];
    if (!refund) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.REFUND_DOES_NOT_EXIST,
          side: Side.REFUND,
          commitment,
          inputIndex,
          refundIndex,
          chainConfigs,
        },
      };
    }

    // Ensure the chain exists and has the right vm type
    const chainData = chainConfigs[refund.chain];
    if (!chainData) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.UNSUPPORTED_CHAIN,
          side: Side.REFUND,
          commitment,
          inputIndex,
          refundIndex,
          chainConfigs,
        },
      };
    }
    if (chainData.vmType !== ChainVmType.EVM) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.WRONG_CHAIN_VM_TYPE,
          side: Side.REFUND,
          commitment,
          inputIndex,
          refundIndex,
          chainConfigs,
        },
      };
    }

    const rpc = getRpc(chainData);

    // Ensure we can retrieve the transaction response
    const tx = await rpc.getTransaction(transactionId);
    if (!tx) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.MISSING_TRANSACTION_RESPONSE,
          side: Side.REFUND,
          commitment,
          inputIndex,
          refundIndex,
          chainConfigs,
          transactionId,
        },
      };
    }

    // Ensure we can retrieve the transaction receipt
    const txReceipt = await rpc.getTransactionReceipt(transactionId);
    if (!txReceipt) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.MISSING_TRANSACTION_RECEIPT,
          side: Side.REFUND,
          commitment,
          inputIndex,
          refundIndex,
          chainConfigs,
          transactionId,
        },
      };
    }

    // Ensure the transaction is not reverted
    if (txReceipt.status !== 1) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.TRANSACTION_REVERTED,
          side: Side.REFUND,
          commitment,
          inputIndex,
          refundIndex,
          chainConfigs,
          transactionId,
        },
      };
    }

    // Checks:
    // - the commitment id must be at the end of the transaction data
    if (
      commitment.id !==
      "0x" + tx.data.slice(-COMMITMENT_ID_LENGTH_IN_BYTES * 2)
    ) {
      return {
        status: Status.FAILURE,
        details: {
          reason: ErrorReason.COMMITMENT_ID_NOT_AT_END_OF_CALLDATA,
          side: Side.REFUND,
          commitment,
          inputIndex,
          refundIndex,
          chainConfigs,
          transactionId,
        },
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

    // Parse the payment amount
    let amount: bigint | undefined;
    if (refund.currency.toLowerCase() === NATIVE_CURRENCY) {
      // Case 1: native currency

      if (tx.to?.toLowerCase() === refund.to.toLowerCase()) {
        // Case 1: direct payment

        amount = tx.value;
      } else {
        // Case 2: internal payment

        const calls = await getCallsWithCache();
        for (let i = 0; i < calls.length; i++) {
          const call = calls[i];
          if (call.to.toLowerCase() === refund.to.toLowerCase()) {
            amount = BigInt(call.value);

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
          log.address.toLowerCase() === refund.currency.toLowerCase() &&
          decoded.args.to.toLowerCase() === refund.to.toLowerCase()
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
        details: {
          reason: ErrorReason.COULD_NOT_FIND_PAYMENT,
          side: Side.REFUND,
          commitment,
          inputIndex,
          refundIndex,
          chainConfigs,
          transactionId,
        },
      };
    }

    return {
      status: Status.SUCCESS,
      amount,
    };
  }
}
