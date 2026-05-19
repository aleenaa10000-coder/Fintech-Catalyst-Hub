import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const mockInsert = vi.fn();

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  return {
    ...actual,
    db: {
      insert: () => ({ values: mockInsert }),
    },
    webmentionsTable: {},
  };
});

vi.mock("../../lib/seo", () => ({
  getSiteUrl: () => "https://test.example.com",
}));

const { default: app } = await import("../../app.js");

describe("POST /api/webmention", () => {
  beforeEach(() => {
    mockInsert.mockReset();
    mockInsert.mockResolvedValue([]);
  });

  it("returns 400 when body is empty", async () => {
    const res = await request(app).post("/api/webmention").send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 400 when source is not a valid URL", async () => {
    const res = await request(app)
      .post("/api/webmention")
      .send({ source: "not-a-url", target: "https://test.example.com/blog/post" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when target is not a valid URL", async () => {
    const res = await request(app)
      .post("/api/webmention")
      .send({ source: "https://external.com/page", target: "not-a-url" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when target is on a different domain", async () => {
    const res = await request(app)
      .post("/api/webmention")
      .send({
        source: "https://external.com/page",
        target: "https://other-site.com/blog/post",
      });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: expect.stringContaining("target") });
  });

  it("returns 202 for a valid same-domain webmention", async () => {
    const res = await request(app)
      .post("/api/webmention")
      .send({
        source: "https://external.com/linking-post",
        target: "https://test.example.com/blog/fintech-seo",
      });
    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({ message: expect.any(String) });
    expect(mockInsert).toHaveBeenCalledOnce();
  });
});
