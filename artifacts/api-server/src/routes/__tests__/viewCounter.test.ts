import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const mockReturning = vi.fn();

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  const chain = {
    set: () => chain,
    where: () => chain,
    returning: mockReturning,
  };
  return {
    ...actual,
    db: {
      update: () => chain,
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      }),
      execute: vi.fn().mockResolvedValue([]),
    },
    blogPostsTable: {
      slug: "slug",
      viewCount: "viewCount",
      noIndex: "noIndex",
      publishedAt: "publishedAt",
    },
  };
});

const { default: app } = await import("../../app.js");

describe("POST /api/blog/posts/:slug/view", () => {
  beforeEach(() => {
    mockReturning.mockReset();
  });

  it("returns 404 when the post does not exist", async () => {
    mockReturning.mockResolvedValue([]);
    const res = await request(app)
      .post("/api/blog/posts/nonexistent-post/view")
      .send();
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 200 and updated view count when post exists", async () => {
    mockReturning.mockResolvedValue([
      { slug: "intro-to-fintech-seo", viewCount: 42 },
    ]);
    const res = await request(app)
      .post("/api/blog/posts/intro-to-fintech-seo/view")
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      slug: "intro-to-fintech-seo",
      viewCount: 42,
    });
  });

  it("does not rate-limit a single request", async () => {
    mockReturning.mockResolvedValue([{ slug: "test-slug", viewCount: 1 }]);
    const res = await request(app)
      .post("/api/blog/posts/test-slug/view")
      .send();
    expect(res.status).not.toBe(429);
  });
});
