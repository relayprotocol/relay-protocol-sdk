import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodSchema, z } from "zod";

export type Endpoint = {
  method: "get" | "post";
  path: string;
  handlers: RequestHandler<any, any, any, any, any>[];
};

export const validateSchema =
  (schema: ZodSchema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      return res.status(400).json(error);
    }
  };
