import { z } from "zod";

import { Endpoint, validateSchema } from "../utils";

export default {
  method: "get",
  path: "/status/v1",
  handlers: [
    validateSchema(
      z.object({
        query: z.object({
          requestId: z.string(),
        }),
      })
    ),
    (_req, res) => {
      return res.send({ message: "Success" });
    },
  ],
} as Endpoint;
