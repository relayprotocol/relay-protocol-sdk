import { describe, expect, test } from "vitest";
import { generateAddress } from "../../src/hub/hub-utils";
import { addressesTestCases } from "./fixtures/address";
import { ethers } from "ethers";

describe("Virtual Addresses", () => {
  test.each(addressesTestCases)("$name", ({ input, expectedAddress }) => {
    const address = generateAddress(input);

    const differentInput = {
      ...input,
      chainId: input.chainId + 1n,
    };
    const differentAddress = generateAddress(differentInput);
    expect(address).not.toBe(differentAddress);
    expect(address).toBe(expectedAddress);

    // address with correct checksum
    expect(ethers.getAddress(expectedAddress)).toBe(expectedAddress);
  });
});
