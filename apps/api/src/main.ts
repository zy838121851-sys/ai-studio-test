import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";

import { AppModule } from "./app.module.js";

const host = process.env.REWRITE_API_HOST ?? "127.0.0.1";
const port = Number(process.env.REWRITE_API_PORT ?? 4100);

const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
await app.listen(port, host);

Logger.log(`Rewrite API listening on http://${host}:${port}`, "Bootstrap");
