import pino from "pino";
import config from "../config/index.js";

const logger = pino({
  level: config.LOG_LEVEL || "info",
  redact: {
    paths: ['req.headers.authorization', 'req.headers["x-api-key"]', 'err.config.headers.Authorization', 'err.response.request._header', '*.buffer', '*.data'],
    censor: '[REDACTED_FOR_SECURITY]'
  },
  transport:
    config.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        }
      : undefined,
});

export default logger;
