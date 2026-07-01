import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { chatRouter } from "./routes/chat.routes.js";
import { bookingRouter } from "./routes/booking.routes.js";
import { salonRouter } from "./routes/salon.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { logger } from "./utils/logger.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// Chat endpoint gets a tighter rate limit to control Gemini API cost/abuse.
const chatLimiter = rateLimit({ windowMs: 60_000, max: 30 });
const bookingLimiter = rateLimit({ windowMs: 60_000, max: 20 });

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/chat", chatLimiter, chatRouter);
app.use("/api/bookings", bookingLimiter, bookingRouter);
app.use("/api/salon", salonRouter);
app.use("/api/admin", adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  logger.info(`Nail Bar API listening on port ${env.port}`);
});
