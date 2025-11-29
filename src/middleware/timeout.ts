import type { Request, Response, NextFunction } from "express";
import { env } from "../../env.ts";

/**
 * Request timeout middleware
 * Sets timeout for both request and response to prevent hanging connections
 */
export function requestTimeoutMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Set timeout for the request
  req.setTimeout(env.REQUEST_TIMEOUT_MS, () => {
    console.error(`Request timeout: ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({
        error: "Request timeout",
        message: "The request took too long to process",
      });
    }
  });

  // Set timeout for the response
  res.setTimeout(env.REQUEST_TIMEOUT_MS, () => {
    console.error(`Response timeout: ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(504).json({
        error: "Gateway timeout",
        message: "The server took too long to respond",
      });
    }
  });

  next();
}
