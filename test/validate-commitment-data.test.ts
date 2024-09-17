import axios from "axios";
import { expect } from "chai";
import { getBytes } from "ethers";
import hre from "hardhat";

import { config } from "../src/config";
import { Commitment, getCommitmentId } from "../src/core/commitment";

describe("Validate commitment data", () => {
  it("success case", async () => {
    const [user, solver] = await hre.ethers.getSigners();

    const commitment: Commitment = {
      solver: solver.address,
      inputs: [
        {
          chain: "ethereum",
          payment: {
            currency: "0x0000000000000000000000000000000000000000",
            amount: "1000000000000000000",
            to: solver.address,
          },
          refund: [
            {
              currency: "0x0000000000000000000000000000000000000000",
              minAmount: "9900000000000000000",
              to: user.address,
            },
          ],
        },
      ],
      output: {
        chain: "ethereum",
        payment: {
          currency: "0x0000000000000000000000000000000000000000",
          minAmount: "9900000000000000000",
          expectedAmount: "9900000000000000000",
          lateAmount: "9900000000000000000",
          to: user.address,
        },
      },
      salt: "0",
    };

    const commitmentId = getCommitmentId(commitment);
    const signature = await solver.signMessage(getBytes(commitmentId));

    const result = await axios
      .post(`http://localhost:${config.port}/validate/commitment-data/v1`, {
        commitment,
        signature,
      })
      .catch((error) => {
        expect(false, `Request failed: ${JSON.stringify(error.response.data)}`);
        throw error;
      });

    expect(result.data.status).to.eq("success");
  });
});
