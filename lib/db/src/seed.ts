import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  authorsTable,
  blogPostsTable,
  glossaryTermsTable,
  locationPagesTable,
  pricingPlansTable,
  referringDomainsTable,
  servicesTable,
  siteStatsTable,
  testimonialsTable,
} from "./schema";
import type { AuthorSocial } from "./schema";
import pricingSeed from "./seed-data/pricing.json";
import servicesSeed from "./seed-data/services.json";
import testimonialsSeed from "./seed-data/testimonials.json";
import statsSeed from "./seed-data/stats.json";
import blogPostsSeed from "./seed-data/blog_posts.json";
import authorsSeed from "./seed-data/authors.json";
import referringDomainsSeed from "./seed-data/referring_domains.json";
import locationsSeed from "./seed-data/locations.json";
import glossarySeed from "./seed-data/glossary.json";

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

type AuthorSeedRow = {
  slug: string;
  name: string;
  role: string;
  photo: string;
  short_bio: string;
  full_bio: string[];
  expertise: string[];
  credentials: string[];
  years_experience: number;
  location: string;
  social: AuthorSocial;
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

type ReferringDomainSeedRow = {
  domain: string;
  first_seen_at: string;
  source: string;
};

type LocationSeedRow = {
  slug: string;
  city: string;
  region: string | null;
  country: string;
  country_code: string;
  headline: string;
  body: string;
  seo_title: string | null;
  seo_description: string | null;
};

type GlossarySeedRow = {
  slug: string;
  term: string;
  short_def: string;
  body: string;
  category: string | null;
  related_terms: string[];
};

export type SeedReport = {
  pricingPlans: number;
  services: number;
  testimonials: number;
  siteStats: number;
  blogPosts: number;
  authors: number;
  referringDomains: number;
  locationPages: number;
  glossaryTerms: number;
};

export async function runSeed(db: AnyDb): Promise<SeedReport> {
  const report: SeedReport = {
    pricingPlans: 0,
    services: 0,
    testimonials: 0,
    siteStats: 0,
    blogPosts: 0,
    authors: 0,
    referringDomains: 0,
    locationPages: 0,
    glossaryTerms: 0,
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

  if (await isEmpty(db, "authors")) {
    const rows = (authorsSeed as AuthorSeedRow[]).map((r, i) => ({
      slug: r.slug,
      name: r.name,
      role: r.role,
      photo: r.photo,
      shortBio: r.short_bio,
      fullBio: r.full_bio,
      expertise: r.expertise,
      credentials: r.credentials,
      yearsExperience: r.years_experience,
      location: r.location,
      social: r.social,
      sortOrder: i,
    }));
    await db.insert(authorsTable).values(rows);
    report.authors = rows.length;
  }

  if (await isEmpty(db, "referring_domains")) {
    const rows = (referringDomainsSeed as ReferringDomainSeedRow[]).map((r) => ({
      domain: r.domain,
      firstSeenAt: new Date(r.first_seen_at),
      source: r.source,
    }));
    await db.insert(referringDomainsTable).values(rows);
    report.referringDomains = rows.length;
  }

  if (await isEmpty(db, "location_pages")) {
    const rows = (locationsSeed as LocationSeedRow[]).map((r) => ({
      slug: r.slug,
      city: r.city,
      region: r.region ?? undefined,
      country: r.country,
      countryCode: r.country_code,
      headline: r.headline,
      body: r.body,
      seoTitle: r.seo_title ?? undefined,
      seoDescription: r.seo_description ?? undefined,
    }));
    await db.insert(locationPagesTable).values(rows);
    report.locationPages = rows.length;
  }

  if (await isEmpty(db, "glossary_terms")) {
    const rows = (glossarySeed as GlossarySeedRow[]).map((r) => ({
      slug: r.slug,
      term: r.term,
      shortDef: r.short_def,
      body: r.body,
      category: r.category ?? undefined,
      relatedTerms: r.related_terms,
    }));
    await db.insert(glossaryTermsTable).values(rows);
    report.glossaryTerms = rows.length;
  }

  return report;
}
