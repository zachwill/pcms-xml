import type { BunRequest } from "bun";

type Handler = (req: BunRequest) => Response | Promise<Response>;

/**
 * Wraps a handler with error handling
 */
export function withErrorHandling(handler: Handler): Handler {
  return async (req: BunRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      console.error("Route error:", error);
      return Response.json(
        {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Parse JSON body from request
 */
export async function parseBody<T>(req: Request): Promise<T> {
  return req.json() as Promise<T>;
}

/**
 * Get query parameters from request URL
 */
export function getQuery(req: Request): URLSearchParams {
  return new URL(req.url).searchParams;
}

/**
 * Create a JSON response with proper headers
 */
export function json<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

/**
 * Create an error response
 */
export function error(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}
