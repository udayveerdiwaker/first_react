/**
 * Configurable IP and User Rate Limiting Middleware
 */

const requestCounts = new Map();

/**
 * Periodically purge expired buckets every 5 minutes
 */
const purgeInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 300000);
if (purgeInterval.unref) purgeInterval.unref();

/**
 * Creates a rate limiting middleware
 * @param {number} maxRequests - Max requests allowed within window
 * @param {number} windowMs - Window duration in milliseconds (default 60s)
 */
function createRateLimiter(maxRequests = 60, windowMs = 60000, message = "Rate limit exceeded. Please wait a moment.") {
  return (req, res, next) => {
    // Whitelist internal loopback health checks
    if (req.path === "/health" || req.path === "/api/health") {
      return next();
    }

    const identifier = req.user?.id || req.ip || req.socket.remoteAddress || "anonymous";
    const key = `${identifier}:${req.baseUrl || ""}${req.path}`;
    const now = Date.now();

    let record = requestCounts.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      requestCounts.set(key, record);
      return next();
    }

    record.count += 1;
    if (record.count > maxRequests) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfterSec);
      return res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message,
          errorId: `err-rate-limit-${Date.now()}`,
        },
        retryAllowed: false,
        retryAfterSec,
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
  standardLimiter: createRateLimiter(100, 60000), // 100 req/min
  aiChatLimiter: createRateLimiter(30, 60000, "Too many AI generation requests. Please wait a moment."),
  searchLimiter: createRateLimiter(20, 60000, "Search rate limit reached. Please wait a moment."),
  imageLimiter: createRateLimiter(15, 60000, "Image generation rate limit reached. Please wait a moment."),
};
