import "reflect-metadata";

import { randomUUID } from "node:crypto";

import fastifyCookie from "@fastify/cookie";
import fastifyMultipart from "@fastify/multipart";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { ApiExceptionFilter } from "./api-exception.filter.js";
import { AppModule } from "./app.module.js";
import { PlatformService } from "./platform.service.js";
import { StructuredLogger } from "./structured-logger.js";

const logger = new StructuredLogger();
const adapter = new FastifyAdapter({
  trustProxy: true,
  bodyLimit: 2 * 1024 * 1024,
  requestIdHeader: "x-request-id",
  genReqId: () => randomUUID()
});
const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, { logger });
const platform = app.get(PlatformService);
const config = platform.config;

await app.register(fastifyCookie, { secret: config.sessionSecret });
await app.register(fastifyMultipart, {
  limits: {
    files: 8,
    fileSize: 20 * 1024 * 1024,
    fields: 20
  }
});

app.enableCors({
  origin: config.appBaseUrl.origin,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
});
app.setGlobalPrefix("api/v1");
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true
  })
);
app.useGlobalFilters(new ApiExceptionFilter());
app.enableShutdownHooks();

adapter.getInstance().addHook("onRequest", (request, reply, done) => {
  reply.header("x-request-id", request.id);
  done();
});

const openApiConfig = new DocumentBuilder()
  .setTitle("AI Studio Rewrite API")
  .setDescription("Versioned API for the React/NestJS rewrite")
  .setVersion("1.0")
  .addCookieAuth("ai_studio_rewrite_session")
  .build();
const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
SwaggerModule.setup("api/docs", app, openApiDocument, {
  jsonDocumentUrl: "/api/v1/openapi.json"
});

await app.listen(config.apiPort, config.apiHost);

logger.log(
  `Rewrite API listening on http://${config.apiHost}:${config.apiPort}`,
  "Bootstrap"
);
