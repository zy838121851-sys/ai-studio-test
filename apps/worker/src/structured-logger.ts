import type { LoggerService } from "@nestjs/common";

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

  private write(level: string, message: unknown, context?: string, trace?: string): void {
    const event = {
      timestamp: new Date().toISOString(),
      level,
      service: "ai-studio-rewrite-worker",
      context: context ?? "Application",
      message: typeof message === "string" ? message : "Structured worker event",
      ...(trace ? { trace } : {})
    };
    const output = `${JSON.stringify(event)}\n`;

    if (level === "error") {
      process.stderr.write(output);
    } else {
      process.stdout.write(output);
    }
  }
}
