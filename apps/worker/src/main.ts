import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { WorkerModule } from "./worker.module.js";

await NestFactory.createApplicationContext(WorkerModule);
Logger.log("Rewrite worker application context started", "Bootstrap");
