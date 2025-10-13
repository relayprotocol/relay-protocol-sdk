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
        hubToAddress: string;
        hubTokenId: string;
        amount: string;
      };
    }
  | {
      type: ActionType.BURN;
      data: {
        hubFromAddress: string;
        hubTokenId: string;
        amount: string;
      };
    }
  | {
      type: ActionType.TRANSFER;
      data: {
        hubFromAddress: string;
        hubToAddress: string;
        hubTokenId: string;
        amount: string;
      };
    };

export const encodeAction = (action: DecodedAction): string => {
  switch (action.type) {
    case ActionType.MINT: {
      return encodeAbiParameters(
        parseAbiParameters([
          "uint8 type",
          "address hubToAddress",
          "uint256 hubTokenId",
          "uint256 amount",
        ]),
        [
          action.type,
          action.data.hubToAddress as `0x${string}`,
          BigInt(action.data.hubTokenId),
          BigInt(action.data.amount),
        ]
      );
    }

    case ActionType.BURN: {
      return encodeAbiParameters(
        parseAbiParameters([
          "uint8 type",
          "address hubFromAddress",
          "uint256 hubTokenId",
          "uint256 amount",
        ]),
        [
          action.type,
          action.data.hubFromAddress as `0x${string}`,
          BigInt(action.data.hubTokenId),
          BigInt(action.data.amount),
        ]
      );
    }

    case ActionType.TRANSFER: {
      return encodeAbiParameters(
        parseAbiParameters([
          "uint8 type",
          "address hubFromAddress",
          "address hubToAddress",
          "uint256 hubTokenId",
          "uint256 amount",
        ]),
        [
          action.type,
          action.data.hubFromAddress as `0x${string}`,
          action.data.hubToAddress as `0x${string}`,
          BigInt(action.data.hubTokenId),
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
          "address hubToAddress",
          "uint256 hubTokenId",
          "uint256 amount",
        ]),
        action as Hex
      );

      return {
        type: ActionType.MINT,
        data: {
          hubToAddress: result[1].toString(),
          hubTokenId: result[2].toString(),
          amount: result[3].toString(),
        },
      };
    }

    case ActionType.BURN: {
      const result = decodeAbiParameters(
        parseAbiParameters([
          "uint8 type",
          "address hubFromAddress",
          "uint256 hubTokenId",
          "uint256 amount",
        ]),
        action as Hex
      );

      return {
        type: ActionType.BURN,
        data: {
          hubFromAddress: result[1].toString(),
          hubTokenId: result[2].toString(),
          amount: result[3].toString(),
        },
      };
    }

    case ActionType.TRANSFER: {
      const result = decodeAbiParameters(
        parseAbiParameters([
          "uint8 type",
          "address hubFromAddress",
          "address hubToAddress",
          "uint256 hubTokenId",
          "uint256 amount",
        ]),
        action as Hex
      );

      return {
        type: ActionType.TRANSFER,
        data: {
          hubFromAddress: result[1].toString(),
          hubToAddress: result[2].toString(),
          hubTokenId: result[3].toString(),
          amount: result[4].toString(),
        },
      };
    }

    default: {
      throw new Error("Unsupported action type");
    }
  }
};
