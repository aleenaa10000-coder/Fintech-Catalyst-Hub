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

/**
 * Rate limiter for the public GET /blog/posts list endpoint.
 * Allows 60 requests per IP per minute — enough for any legitimate SPA
 * navigation pattern (infinite scroll, category switches, pagination) while
 * blocking query-param fuzzing and scraping loops that hammer the endpoint
 * with hundreds of crafted requests per second.
 */
export const blogListRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many requests to the blog list. Please slow down and try again in a minute.",
  },
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for admin service mutation endpoints (POST /services,
 * DELETE /services/:slug). Even though these are protected by requireAdmin,
 * a rate limit adds a second layer of defence against credential abuse or
 * brute-force service manipulation — limiting an attacker who has obtained
 * a valid admin session to 20 mutations per 15 minutes per IP.
 */
export const adminMutationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many admin mutation requests from this IP. Please wait before retrying.",
  },
  skipSuccessfulRequests: false,
});
