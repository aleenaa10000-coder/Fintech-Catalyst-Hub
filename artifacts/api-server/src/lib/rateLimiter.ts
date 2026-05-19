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

/**
 * Rate limiter for tool rating submissions.
 * Allows up to 10 ratings per IP per hour to prevent abuse while
 * allowing legitimate users to rate multiple tools.
 */
export const ratingRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many rating submissions. Please wait before rating again.",
  },
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for post view counter increments.
 * Allows up to 30 view pings per IP per 5 minutes — enough for normal
 * browsing (a reader visiting several articles in a session) while
 * preventing bot inflation of view counts.
 */
export const viewRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many requests.",
  },
  skipFailedRequests: true,
});
