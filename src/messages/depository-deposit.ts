import { bytesToHex, hashStruct } from "viem";

import {
  ChainIdToVmType,
  encodeAddress,
  encodeBytes,
  encodeTransactionId,
  getChainVmType,
} from "../utils";

export type DepositoryDepositMessage = {
  data: {
    chainId: string;
    transactionId: string;
  };
  result: {
    onchainId: string;
    depository: string;
    depositId: string;
    depositor: string;
    currency: string;
    amount: string;
  };
};

export const getDepositoryDepositMessageId = (
  message: DepositoryDepositMessage,
  chainsConfig: ChainIdToVmType
) => {
  const vmType = (chainId: string) => getChainVmType(chainId, chainsConfig);

  return hashStruct({
    types: {
      DepositoryDeposit: [
        { name: "data", type: "Data" },
        { name: "result", type: "Result" },
      ],
      Data: [
        { name: "chainId", type: "string" },
        { name: "transactionId", type: "bytes" },
      ],
      Result: [
        { name: "onchainId", type: "bytes32" },
        { name: "depository", type: "bytes" },
        { name: "depositId", type: "bytes32" },
        { name: "depositor", type: "bytes" },
        { name: "currency", type: "bytes" },
        { name: "amount", type: "uint256" },
      ],
    },
    primaryType: "DepositoryDeposit",
    data: {
      data: {
        chainId: message.data.chainId,
        transactionId: encodeTransactionId(
          message.data.transactionId,
          vmType(message.data.chainId)
        ),
      },
      result: {
        onchainId: bytesToHex(encodeBytes(message.result.onchainId)),
        depository: encodeAddress(
          message.result.depository,
          vmType(message.data.chainId)
        ),
        depositId: bytesToHex(encodeBytes(message.result.depositId)),
        depositor: encodeAddress(
          message.result.depositor,
          vmType(message.data.chainId)
        ),
        currency: encodeAddress(
          message.result.currency,
          vmType(message.data.chainId)
        ),
        amount: message.result.amount,
      },
    },
  });
};
