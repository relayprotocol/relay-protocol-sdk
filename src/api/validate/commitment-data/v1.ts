import { z } from "zod";

import { commitmentSchema } from "../../_internal/types";
import { Endpoint } from "../../types";
import { validateSchema } from "../../zod";
import { Commitment } from "../../../core/commitment";
import { validateCommitmentData } from "../../../core/validation";

export default {
  method: "post",
  path: "/validate/commitment-data/v1",
  handlers: [
    validateSchema(
      z.object({
        body: z.object({
          commitment: commitmentSchema,
          signature: z.string(),
        }),
      })
    ),
    async (req, res) => {
      const body = req.body;

      const commitment = body.commitment as Commitment;
      const signature = body.signature as string;

      const result = await validateCommitmentData(commitment, signature);
      return res.send(result);
    },
  ],
} as Endpoint;
