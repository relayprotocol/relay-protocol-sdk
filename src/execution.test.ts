import { describe, it, expect } from "vitest";
import {
  ActionType,
  encodeAction,
  decodeAction,
} from "./messages/v2.2/execution";

const actions = [
  {
    type: ActionType.MINT,
    data: {
      hubToAddress: "0x1234567890123456789012345678901234567890",
      hubTokenId: 1n,
      amount: "1000",
    },
  },
  {
    type: ActionType.BURN,
    data: {
      hubFromAddress: "0x9876543210987654321098765432109876543210",
      hubTokenId: 2n,
      amount: "500",
    },
  },
  {
    type: ActionType.TRANSFER,
    data: {
      hubFromAddress: "0x1111111111111111111111111111111111111111",
      hubToAddress: "0x2222222222222222222222222222222222222222",
      hubTokenId: 3n,
      amount: "250",
    },
  },
];

describe("execution", () => {
  it("should encode and decode MINT action correctly", () => {
    const action = actions[0];
    const encoded = encodeAction(action);
    const decoded = decodeAction(encoded);

    expect(decoded.type).toBe(ActionType.MINT);
    expect(decoded.data.hubToAddress).toBe(action.data.hubToAddress);
    expect(decoded.data.hubTokenId).toBe(action.data.hubTokenId);
    expect(decoded.data.amount).toBe(action.data.amount);
  });

  it("should encode and decode BURN action correctly", () => {
    const action = actions[1];
    const encoded = encodeAction(action as any);
    const decoded = decodeAction(encoded);
    expect(decoded.type).toBe(ActionType.BURN);
    expect(decoded.data.hubFromAddress).toBe(action.data.hubFromAddress);
    expect(decoded.data.hubTokenId).toBe(action.data.hubTokenId);
    expect(decoded.data.amount).toBe(action.data.amount);
  });

  it("should encode and decode TRANSFER action correctly", () => {
    const action = actions[2];
    const encoded = encodeAction(action as any);
    const decoded = decodeAction(encoded);
    expect(decoded.type).toBe(ActionType.TRANSFER);
    expect(decoded.data.hubFromAddress).toBe(action.data.hubFromAddress);
    expect(decoded.data.hubToAddress).toBe(action.data.hubToAddress);
    expect(decoded.data.hubTokenId).toBe(action.data.hubTokenId);
    expect(decoded.data.amount).toBe(action.data.amount);
  });
});
