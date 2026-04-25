import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  blogPostsTable,
  pricingPlansTable,
  servicesTable,
  siteStatsTable,
  testimonialsTable,
} from "./schema";
import pricingSeed from "./seed-data/pricing.json";
import servicesSeed from "./seed-data/services.json";
import testimonialsSeed from "./seed-data/testimonials.json";
import statsSeed from "./seed-data/stats.json";
import blogPostsSeed from "./seed-data/blog_posts.json";

type AnyDb = NodePgDatabase<Record<string, unknown>>;

async function isEmpty(db: AnyDb, table: string): Promise<boolean> {
  const result = await db.execute(
    sql.raw(`SELECT COUNT(*)::int AS count FROM "${table}"`),
  );
  const row = (result.rows?.[0] ?? { count: 0 }) as { count: number };
  return Number(row.count) === 0;
}

type PricingRow = {
  name: string;
  tagline: string;
  price_monthly: number;
  price_unit: string;
  description: string;
  features: string[];
  cta_label: string;
  highlighted: boolean;
  sort_order: number;
};

type ServiceRow = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  deliverables: string[];
  icon: string;
};

type TestimonialRow = {
  name: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
};

type StatsRow = {
  clients_served: number;
  articles_published: number;
  backlinks_acquired: number;
  average_domain_rating: number;
};

type BlogPostRow = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  author_role: string;
  category: string;
  tags: string[];
  cover_image: string;
  reading_minutes: number;
  featured: boolean;
  published_at: string;
};

export type SeedReport = {
  pricingPlans: number;
  services: number;
  testimonials: number;
  siteStats: number;
  blogPosts: number;
};

export async function runSeed(db: AnyDb): Promise<SeedReport> {
  const report: SeedReport = {
    pricingPlans: 0,
    services: 0,
    testimonials: 0,
    siteStats: 0,
    blogPosts: 0,
  };

  if (await isEmpty(db, "pricing_plans")) {
    const rows = (pricingSeed as PricingRow[]).map((r) => ({
      name: r.name,
      tagline: r.tagline,
      priceMonthly: r.price_monthly,
      priceUnit: r.price_unit,
      description: r.description,
      features: r.features,
      ctaLabel: r.cta_label,
      highlighted: r.highlighted,
      sortOrder: r.sort_order,
    }));
    await db.insert(pricingPlansTable).values(rows);
    report.pricingPlans = rows.length;
  }

  if (await isEmpty(db, "services")) {
    const rows = (servicesSeed as ServiceRow[]).map((r) => ({
      slug: r.slug,
      name: r.name,
      tagline: r.tagline,
      description: r.description,
      deliverables: r.deliverables,
      icon: r.icon,
    }));
    await db.insert(servicesTable).values(rows);
    report.services = rows.length;
  }

  if (await isEmpty(db, "testimonials")) {
    const rows = (testimonialsSeed as TestimonialRow[]).map((r) => ({
      name: r.name,
      role: r.role,
      company: r.company,
      quote: r.quote,
      rating: r.rating,
    }));
    await db.insert(testimonialsTable).values(rows);
    report.testimonials = rows.length;
  }

  if (await isEmpty(db, "site_stats")) {
    const s = statsSeed as StatsRow;
    await db.insert(siteStatsTable).values({
      clientsServed: s.clients_served,
      articlesPublished: s.articles_published,
      backlinksAcquired: s.backlinks_acquired,
      averageDomainRating: s.average_domain_rating,
    });
    report.siteStats = 1;
  }

  if (await isEmpty(db, "blog_posts")) {
    const rows = (blogPostsSeed as BlogPostRow[]).map((r) => ({
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      content: r.content,
      author: r.author,
      authorRole: r.author_role,
      category: r.category,
      tags: r.tags,
      coverImage: r.cover_image,
      readingMinutes: r.reading_minutes,
      featured: r.featured,
      publishedAt: new Date(r.published_at),
    }));
    await db.insert(blogPostsTable).values(rows);
    report.blogPosts = rows.length;
  }

  return report;
}
