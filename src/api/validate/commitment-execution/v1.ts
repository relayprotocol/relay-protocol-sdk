import { z } from "zod";

import { commitmentSchema } from "../../_internal/types";
import { Endpoint } from "../../types";
import { validateSchema } from "../../zod";
import { Commitment } from "../../../core/commitment";
import { validateCommitmentExecution } from "../../../core/validation";

export default {
  method: "post",
  path: "/validate/commitment-execution/v1",
  handlers: [
    validateSchema(
      z.object({
        body: z.object({
          commitment: commitmentSchema,
          signature: z.string(),
          inputExecutions: z.array(
            z.object({
              inputIndex: z.number(),
              transactionId: z.string(),
            })
          ),
          outputExecution: z.object({
            transactionId: z.string(),
          }),
        }),
      })
    ),
    async (req, res) => {
      const body = req.body;

      const commitment = body.commitment as Commitment;
      const signature = body.signature as string;
      const inputExecutions = body.inputExecutions as {
        inputIndex: number;
        transactionId: string;
      }[];
      const outputExecution = body.outputExecution as { transactionId: string };

      const result = await validateCommitmentExecution(
        commitment,
        signature,
        inputExecutions,
        outputExecution
      );
      return res.send(result);
    },
  ],
} as Endpoint;
