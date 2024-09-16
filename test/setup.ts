import { config as dotEnvConfig } from "dotenv";
dotEnvConfig({ path: __dirname + "/../.env.test" });

// Start the service
import "../src/index";
