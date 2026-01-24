import { RouteRegistry } from "@/lib/server/router";

export const exampleRouter = new RouteRegistry();

// GET /api/example
exampleRouter.get("/", async () => {
  return Response.json({
    message: "Hello from the API!",
    timestamp: new Date().toISOString(),
  });
});

// GET /api/example/:id
exampleRouter.get("/:id", async (req) => {
  const id = req.params.id;
  return Response.json({
    id,
    message: `You requested item ${id}`,
  });
});

// POST /api/example
exampleRouter.post("/", async (req) => {
  const body = await req.json();
  return Response.json({
    received: body,
    message: "Data received successfully",
  });
});
