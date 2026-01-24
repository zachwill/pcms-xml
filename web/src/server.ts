import homepage from "./index.html";
import { router } from "./lib/server/router";
import { exampleRouter } from "./api/routes/example";
import { salaryBookRouter } from "./api/routes/salary-book";

// Merge all routers
router.merge(exampleRouter, "/api/example");
router.merge(salaryBookRouter, "/api/salary-book");

// Add static/SPA routes
router.register("/favicon.ico", new Response(null, { status: 204 }));
router.register("/*", homepage);

const server = Bun.serve({
  port: process.env.PORT || 3002,
  hostname: "0.0.0.0",

  routes: router.compile(),

  error(error) {
    console.error("Fatal Server Error:", error);
    return Response.json({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  },
});

console.log(`Server running at http://localhost:${server.port}`);
