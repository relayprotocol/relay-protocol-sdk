import { describe, it, expect } from "vitest";
import { getWithdrawalAddress } from "../src/messages/v2.2/withdrawal-execution";
import { getAddress } from "viem";

describe("getWithdrawalAddress", () => {
  it("should return a valid withdrawal address", () => {
    const params = {
      depositoryAddress: "0x1234567890123456789012345678901234567890",
      depositoryChainId: 1n,
      currency: "10340230",
      recipientAddress: "0x9876543210987654321098765432109876543210",
      owner: "0x9876543210987654321098765432109876543210",
      amount: 1000n,
      withdrawalNonce: "haha",
    };

    const address = getWithdrawalAddress(params);
    expect(address).toMatch(/^0x[0-9a-f]{40}$/i);
    expect(address).toBeTruthy();
    expect(getAddress(address).toLowerCase()).toMatch(address);
  });
});
