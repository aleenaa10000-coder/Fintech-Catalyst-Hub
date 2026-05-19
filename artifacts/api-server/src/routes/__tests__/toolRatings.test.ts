import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const mockInsert = vi.fn();

const chainable: Record<string, unknown> = {};
chainable["from"] = () => chainable;
chainable["where"] = () => chainable;
chainable["groupBy"] = () => chainable;
chainable["orderBy"] = () => chainable;
chainable["then"] = (resolve: (v: unknown[]) => void, reject?: (e: unknown) => void) =>
  Promise.resolve([{ ratingValue: "4.0", ratingCount: "3" }]).then(resolve, reject);

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  return {
    ...actual,
    db: {
      select: () => ({ from: () => chainable }),
      insert: () => ({ values: mockInsert }),
    },
    toolRatingsTable: {
      id: "id",
      toolSlug: "toolSlug",
      rating: "rating",
    },
  };
});

const { default: app } = await import("../../app.js");

describe("POST /api/tools/:slug/ratings", () => {
  beforeEach(() => {
    mockInsert.mockReset();
    mockInsert.mockResolvedValue([]);
  });

  it("returns 404 for an unknown tool slug", async () => {
    const res = await request(app)
      .post("/api/tools/nonexistent-tool/ratings")
      .send({ rating: 3 });
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: expect.stringContaining("not found") });
  });

  it("returns 400 when rating is missing", async () => {
    const res = await request(app)
      .post("/api/tools/readability-checker/ratings")
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when rating is out of range (0)", async () => {
    const res = await request(app)
      .post("/api/tools/readability-checker/ratings")
      .send({ rating: 0 });
    expect(res.status).toBe(400);
  });

  it("returns 400 when rating is out of range (6)", async () => {
    const res = await request(app)
      .post("/api/tools/readability-checker/ratings")
      .send({ rating: 6 });
    expect(res.status).toBe(400);
  });

  it("returns 400 when rating is a non-integer", async () => {
    const res = await request(app)
      .post("/api/tools/readability-checker/ratings")
      .send({ rating: 3.5 });
    expect(res.status).toBe(400);
  });

  it("returns 201 with aggregated stats for a valid rating submission", async () => {
    const res = await request(app)
      .post("/api/tools/readability-checker/ratings")
      .send({ rating: 4 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ toolSlug: "readability-checker" });
    expect(mockInsert).toHaveBeenCalledOnce();
  });
});

describe("GET /api/tools/:slug/ratings", () => {
  it("returns 404 for an unknown tool slug", async () => {
    const res = await request(app).get("/api/tools/nonexistent-tool/ratings");
    expect(res.status).toBe(404);
  });

  it("returns 200 with rating stats for a known slug", async () => {
    const res = await request(app).get("/api/tools/readability-checker/ratings");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ toolSlug: "readability-checker" });
  });
});
