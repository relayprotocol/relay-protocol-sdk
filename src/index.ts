import express from "express";

import { endpoints } from "./api";
import { config } from "./config";
import { logger } from "./logger";

// Initialize app
const app = express();

// Setup endpoints
endpoints.forEach((endpoint) =>
  app[endpoint.method](endpoint.path, ...endpoint.handlers)
);

// Start server
app.listen(config.port, () => {
  logger.info("process", JSON.stringify({ msg: "Started" }));
});
