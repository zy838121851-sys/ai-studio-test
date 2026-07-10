import type { LoggerService } from "@nestjs/common";

type LogLevel = "debug" | "error" | "fatal" | "info" | "verbose" | "warn";

export class StructuredLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write("info", message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write("error", message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write("warn", message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write("debug", message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write("verbose", message, context);
  }

  fatal(message: unknown, context?: string): void {
    this.write("fatal", message, context);
  }

  private write(level: LogLevel, message: unknown, context?: string, trace?: string): void {
    const event = {
      timestamp: new Date().toISOString(),
      level,
      service: "ai-studio-rewrite-api",
      context: context ?? "Application",
      message: normalizeLogMessage(message),
      ...(trace ? { trace } : {})
    };
    const output = `${JSON.stringify(event)}\n`;

    if (level === "error" || level === "fatal") {
      process.stderr.write(output);
    } else {
      process.stdout.write(output);
    }
  }
}

function normalizeLogMessage(message: unknown): string {
  if (typeof message === "string") {
    return message;
  }
  if (message instanceof Error) {
    return message.message;
  }

  return "Structured application event";
}
