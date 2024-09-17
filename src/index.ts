import express from "express";
import asyncHandler from "express-async-handler";

import { endpoints } from "./api";
import { config } from "./config";
import { logger } from "./logger";

// Initialize app
const app = express();
app.use(express.json());

// Setup endpoints
endpoints.forEach((endpoint) =>
  app[endpoint.method](endpoint.path, ...endpoint.handlers.map(asyncHandler))
);

// Start server
app.listen(config.port, () => {
  logger.info("process", JSON.stringify({ msg: "Started" }));
});
