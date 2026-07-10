import { Catch, HttpException, HttpStatus, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import type { ApiErrorEnvelope } from "@ai-studio/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<FastifyRequest>();
    const reply = context.getResponse<FastifyReply>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const response = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = extractMessage(response, status);
    const details = extractDetails(response);
    const envelope: ApiErrorEnvelope = {
      error: {
        code: errorCodeForStatus(status),
        message,
        requestId: request.id,
        ...(details ? { details } : {})
      }
    };

    reply.status(status).send(envelope);
  }
}

function extractMessage(response: string | object | undefined, status: number): string {
  if (typeof response === "string") {
    return response;
  }
  if (response && "message" in response) {
    const message = (response as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  if (status >= 500) {
    return "服务暂时不可用";
  }
  return "请求无法处理";
}

function extractDetails(response: string | object | undefined): Record<string, unknown> | undefined {
  if (!response || typeof response === "string" || !("message" in response)) {
    return undefined;
  }

  const message = (response as { message?: unknown }).message;
  return Array.isArray(message) ? { validationErrors: message } : undefined;
}

function errorCodeForStatus(status: number): string {
  const codes: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: "INVALID_REQUEST",
    [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
    [HttpStatus.FORBIDDEN]: "FORBIDDEN",
    [HttpStatus.NOT_FOUND]: "NOT_FOUND",
    [HttpStatus.CONFLICT]: "CONFLICT",
    [HttpStatus.PAYLOAD_TOO_LARGE]: "UPLOAD_TOO_LARGE",
    [HttpStatus.TOO_MANY_REQUESTS]: "RATE_LIMITED",
    [HttpStatus.SERVICE_UNAVAILABLE]: "SERVICE_UNAVAILABLE"
  };

  return codes[status] ?? "INTERNAL_ERROR";
}
