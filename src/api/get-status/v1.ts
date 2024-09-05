import { z } from "zod";

import { Endpoint } from "../types";
import { validateSchema } from "../zod";
import { Commitment } from "../../core/types";

const userPaymentSchema = z.object({
  to: z.string(),
  currency: z.string(),
  amount: z.string(),
});

const solverPaymentSchema = z.object({
  to: z.string(),
  currency: z.string(),
  minAmount: z.string(),
});

const evmCallSchema = z.object({
  to: z.string(),
  data: z.string(),
  value: z.string(),
});

const callSchema = evmCallSchema;

export default {
  method: "post",
  path: "/status/v1",
  handlers: [
    validateSchema(
      z.object({
        body: z.object({
          commitment: z.object({
            origins: z.array(
              z.object({
                chain: z.string(),
                payment: userPaymentSchema,
                refundOptions: z.array(solverPaymentSchema),
                transactionId: z.string().optional(),
              })
            ),
            destination: z.object({
              chain: z.string(),
              executions: z.array(
                z.object({
                  payment: solverPaymentSchema,
                  call: callSchema.optional(),
                })
              ),
            }),
          }),
        }),
      })
    ),
    (req, res) => {
      const body = req.body;

      const commitment = body.commitment as Commitment;

      return res.send({ message: "Success" });
    },
  ],
} as Endpoint;
