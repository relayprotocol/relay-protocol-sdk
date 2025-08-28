import {
  decodeAbiParameters,
  encodeAbiParameters,
  hashStruct,
  Hex,
  parseAbiParameters,
} from "viem";

import { VmType } from "../../utils";

export enum ActionType {
  MINT,
  BURN,
  TRANSFER,
}

export type ExecutionMessage = {
  idempotencyKey: string;
  actions: string[];
};

export const getExecutionMessageId = (message: ExecutionMessage) => {
  return hashStruct({
    types: {
      Execution: [
        { name: "idempotencyKey", type: "bytes32" },
        { name: "actions", type: "bytes[]" },
      ],
    },
    primaryType: "Execution",
    data: {
      idempotencyKey: message.idempotencyKey,
      actions: message.actions,
    },
  });
};

export type DecodedAction =
  | {
      type: ActionType.MINT;
      data: {
        currencyVmType: VmType;
        currencyChainId: string;
        currency: string;
        toVmType: VmType;
        toChainId: string;
        to: string;
        amount: string;
      };
    }
  | {
      type: ActionType.BURN;
      data: {
        currencyVmType: VmType;
        currencyChainId: string;
        currency: string;
        fromVmType: VmType;
        fromChainId: string;
        from: string;
        amount: string;
      };
    }
  | {
      type: ActionType.TRANSFER;
      data: {
        currencyVmType: VmType;
        currencyChainId: string;
        currency: string;
        fromVmType: VmType;
        fromChainId: string;
        from: string;
        toVmType: VmType;
        toChainId: string;
        to: string;
        amount: string;
      };
    };

export const encodeAction = (action: DecodedAction): string => {
  switch (action.type) {
    case ActionType.MINT: {
      return encodeAbiParameters(
        parseAbiParameters([
          "uint8 type",
          "string currencyVmType",
          "uint256 currencyChainId",
          "string currency",
          "string toVmType",
          "uint256 toChainId",
          "string to",
          "uint256 amount",
        ]),
        [
          action.type,
          action.data.currencyVmType,
          BigInt(action.data.currencyChainId),
          action.data.currency,
          action.data.toVmType,
          BigInt(action.data.toChainId),
          action.data.to,
          BigInt(action.data.amount),
        ]
      );
    }

    case ActionType.BURN: {
      return encodeAbiParameters(
        parseAbiParameters([
          "uint8 type",
          "string currencyVmType",
          "uint256 currencyChainId",
          "string currency",
          "string fromVmType",
          "uint256 fromChainId",
          "string from",
          "uint256 amount",
        ]),
        [
          action.type,
          action.data.currencyVmType,
          BigInt(action.data.currencyChainId),
          action.data.currency,
          action.data.fromVmType,
          BigInt(action.data.fromChainId),
          action.data.from,
          BigInt(action.data.amount),
        ]
      );
    }

    case ActionType.TRANSFER: {
      return encodeAbiParameters(
        parseAbiParameters([
          "uint8 type",
          "string currencyVmType",
          "uint256 currencyChainId",
          "string currency",
          "string fromVmType",
          "uint256 fromChainId",
          "string from",
          "string toVmType",
          "uint256 toChainId",
          "string to",
          "uint256 amount",
        ]),
        [
          action.type,
          action.data.currencyVmType,
          BigInt(action.data.currencyChainId),
          action.data.currency,
          action.data.fromVmType,
          BigInt(action.data.fromChainId),
          action.data.from,
          action.data.toVmType,
          BigInt(action.data.toChainId),
          action.data.to,
          BigInt(action.data.amount),
        ]
      );
    }

    default: {
      throw new Error("Unsupported action type");
    }
  }
};

export const decodeAction = (action: string): DecodedAction => {
  const type = action.slice(0, 4);
  switch (Number(type)) {
    case ActionType.MINT: {
      const result = decodeAbiParameters(
        parseAbiParameters([
          "uint8 type",
          "string currencyVmType",
          "uint256 currencyChainId",
          "string currency",
          "string toVmType",
          "uint256 toChainId",
          "string to",
          "uint256 amount",
        ]),
        action as Hex
      );

      return {
        type: ActionType.MINT,
        data: {
          currencyVmType: result[1] as VmType,
          currencyChainId: result[2].toString(),
          currency: result[3],
          toVmType: result[4] as VmType,
          toChainId: result[5].toString(),
          to: result[6],
          amount: result[7].toString(),
        },
      };
    }

    case ActionType.BURN: {
      const result = decodeAbiParameters(
        parseAbiParameters([
          "uint8 type",
          "string currencyVmType",
          "uint256 currencyChainId",
          "string currency",
          "string fromVmType",
          "uint256 fromChainId",
          "string from",
          "uint256 amount",
        ]),
        action as Hex
      );

      return {
        type: ActionType.BURN,
        data: {
          currencyVmType: result[1] as VmType,
          currencyChainId: result[2].toString(),
          currency: result[3],
          fromVmType: result[4] as VmType,
          fromChainId: result[5].toString(),
          from: result[6],
          amount: result[7].toString(),
        },
      };
    }

    case ActionType.TRANSFER: {
      const result = decodeAbiParameters(
        parseAbiParameters([
          "uint8 type",
          "string currencyVmType",
          "uint256 currencyChainId",
          "string currency",
          "string fromVmType",
          "uint256 fromChainId",
          "string from",
          "string toVmType",
          "uint256 toChainId",
          "string to",
          "uint256 amount",
        ]),
        action as Hex
      );

      return {
        type: ActionType.TRANSFER,
        data: {
          currencyVmType: result[1] as VmType,
          currencyChainId: result[2].toString(),
          currency: result[3],
          fromVmType: result[4] as VmType,
          fromChainId: result[5].toString(),
          from: result[6],
          toVmType: result[7] as VmType,
          toChainId: result[8].toString(),
          to: result[9],
          amount: result[10].toString(),
        },
      };
    }

    default: {
      throw new Error("Unsupported action type");
    }
  }
};
