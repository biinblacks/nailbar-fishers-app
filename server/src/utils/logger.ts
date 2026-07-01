type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, meta?: unknown): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (meta !== undefined) {
    console[level === "info" ? "log" : level](line, meta);
  } else {
    console[level === "info" ? "log" : level](line);
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta),
};
