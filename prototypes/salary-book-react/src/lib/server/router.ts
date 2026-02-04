import type { BunRequest } from "bun";
import { withErrorHandling } from "./utils";

type Handler = (req: BunRequest) => Response | Promise<Response>;
type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export class RouteRegistry {
  private routes: Record<string, any> = {};

  get(path: string, handler: Handler) {
    return this.addRoute(path, "GET", handler);
  }

  post(path: string, handler: Handler) {
    return this.addRoute(path, "POST", handler);
  }

  put(path: string, handler: Handler) {
    return this.addRoute(path, "PUT", handler);
  }

  delete(path: string, handler: Handler) {
    return this.addRoute(path, "DELETE", handler);
  }

  // Registers a raw route (can be object or function)
  register(path: string, handler: any) {
    this.routes[path] = handler;
    return this;
  }

  private addRoute(path: string, method: Method, handler: Handler) {
    // If route doesn't exist, init it
    if (!this.routes[path]) {
      this.routes[path] = {};
    }

    // If it's a function, it means it was a simple handler (usually GET/ALL).
    // Convert to object to attach method.
    if (typeof this.routes[path] === "function") {
      this.routes[path] = { GET: this.routes[path] };
    }

    this.routes[path][method] = handler;
    return this;
  }

  // Merge another registry's routes
  merge(other: RouteRegistry, prefix: string = "") {
    const otherRoutes = other.getRoutes();
    for (const [path, handler] of Object.entries(otherRoutes)) {
        const newPath = prefix ? (path === "/" ? prefix : `${prefix}${path}`) : path;
        this.routes[newPath] = handler;
    }
    return this;
  }

  // Compile routes for Bun.serve, applying error handling to API routes
  compile() {
    const wrapped: any = {};
    for (const [path, handler] of Object.entries(this.routes)) {
      // Only wrap API routes with error handling
      if (path.startsWith("/api")) {
        if (typeof handler === "function") {
          wrapped[path] = withErrorHandling(handler);
        } else if (typeof handler === "object" && handler !== null && !(handler instanceof Response)) {
          wrapped[path] = {};
          for (const [method, methodHandler] of Object.entries(handler)) {
            if (typeof methodHandler === "function") {
              wrapped[path][method] = withErrorHandling(methodHandler as Handler);
            } else {
              wrapped[path][method] = methodHandler;
            }
          }
        } else {
          wrapped[path] = handler;
        }
      } else {
        // Non-API routes passed through as-is
        wrapped[path] = handler;
      }
    }
    return wrapped;
  }

  getRoutes() {
      return this.routes;
  }
}

export const router = new RouteRegistry();
