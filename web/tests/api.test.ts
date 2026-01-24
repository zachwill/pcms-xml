import { describe, test, expect } from "bun:test";

const BASE_URL = "http://localhost:3001";

describe("API Routes", () => {
  describe("GET /api/example", () => {
    test("returns hello message", async () => {
      const response = await fetch(`${BASE_URL}/api/example`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.message).toBe("Hello from the API!");
      expect(data.timestamp).toBeDefined();
    });
  });

  describe("GET /api/example/:id", () => {
    test("returns item by id", async () => {
      const response = await fetch(`${BASE_URL}/api/example/123`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.id).toBe("123");
      expect(data.message).toBe("You requested item 123");
    });
  });

  describe("POST /api/example", () => {
    test("accepts and echoes data", async () => {
      const payload = { name: "test", value: 42 };
      const response = await fetch(`${BASE_URL}/api/example`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.received).toEqual(payload);
      expect(data.message).toBe("Data received successfully");
    });
  });
});
