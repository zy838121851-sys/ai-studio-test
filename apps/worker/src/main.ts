import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { StructuredLogger } from "./structured-logger.js";
import { WorkerModule } from "./worker.module.js";

const logger = new StructuredLogger();
const application = await NestFactory.createApplicationContext(WorkerModule, { logger });
application.enableShutdownHooks();
logger.log("Rewrite worker application context started", "Bootstrap");
