import { RequestHandler } from "express";

export type Endpoint = {
  method: "get" | "post";
  path: string;
  handlers: RequestHandler<any, any, any, any, any>[];
};
