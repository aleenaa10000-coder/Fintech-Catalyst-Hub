import rateLimit from "express-rate-limit";

export const formRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many submissions from this IP. Please wait 15 minutes before trying again.",
  },
  skipSuccessfulRequests: false,
});
