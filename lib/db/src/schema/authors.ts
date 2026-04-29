import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export type AuthorSocial = {
  linkedin?: string;
  twitter?: string;
  website?: string;
  email?: string;
};

export const authorsTable = pgTable("authors", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  photo: text("photo").notNull(),
  shortBio: text("short_bio").notNull(),
  fullBio: jsonb("full_bio").$type<string[]>().notNull().default([]),
  expertise: jsonb("expertise").$type<string[]>().notNull().default([]),
  credentials: jsonb("credentials").$type<string[]>().notNull().default([]),
  yearsExperience: integer("years_experience").notNull().default(0),
  location: text("location").notNull().default(""),
  social: jsonb("social").$type<AuthorSocial>().notNull().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type AuthorRow = typeof authorsTable.$inferSelect;
