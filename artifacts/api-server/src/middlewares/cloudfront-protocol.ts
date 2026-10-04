import type { RequestHandler } from "express";

// Enable only when the ALB origin is restricted to trusted CloudFront traffic
// and its origin-request policy forwards CloudFront-Forwarded-Proto.
export function cloudFrontProtocol(enabled: boolean): RequestHandler {
  return (req, _res, next) => {
    if (enabled && req.headers["cloudfront-forwarded-proto"] === "https") {
      req.headers["x-forwarded-proto"] = "https";
    }
    next();
  };
}