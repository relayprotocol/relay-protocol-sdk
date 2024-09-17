import axios from "axios";
import { expect } from "chai";
import { getBytes } from "ethers";
import hre from "hardhat";

import { config } from "../../../src/config";
import { Commitment, getCommitmentId } from "../../../src/core/commitment";

describe("Validate commitment execution", () => {
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

    // Execute the input
    const inputTransaction = await user.sendTransaction({
      to: commitment.inputs[0].payment.to,
      data: commitmentId,
      value: commitment.inputs[0].payment.amount,
    });

    // Execute the output
    const outputTransaction = await solver.sendTransaction({
      to: commitment.output.payment.to,
      data: commitmentId,
      value: commitment.output.payment.minAmount,
    });

    const result = await axios
      .post(
        `http://localhost:${config.port}/validate/commitment-execution/v1`,
        {
          commitment,
          signature,
          inputExecutions: [
            {
              inputIndex: 0,
              transactionId: inputTransaction?.hash,
            },
          ],
          outputExecution: {
            transactionId: outputTransaction.hash,
          },
        }
      )
      .catch((error) => {
        expect(false, `Request failed: ${JSON.stringify(error.response.data)}`);
        throw error;
      });

    expect(result.data.status).to.eq("success");
  });
});
