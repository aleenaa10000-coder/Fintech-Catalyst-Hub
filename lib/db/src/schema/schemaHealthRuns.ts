import { pgTable, serial, integer, boolean, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

/**
 * One row per schema health check execution — both scheduled daily runs and
 * admin-triggered "send now" clicks. Provides a rolling history the admin
 * panel can surface as a timeline so regressions are traceable over time.
 */
export const schemaHealthRunsTable = pgTable(
  "schema_health_runs",
  {
    id:         serial("id").primaryKey(),
    ranAt:      timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
    trigger:    text("trigger").notNull().default("scheduled"),
    total:      integer("total").notNull().default(0),
    passed:     integer("passed").notNull().default(0),
    failures:   integer("failures").notNull().default(0),
    warnings:   integer("warnings").notNull().default(0),
    emailSent:  boolean("email_sent").notNull().default(false),
    skipReason: text("skip_reason"),
    issues: jsonb("issues").$type<
      Array<{ schemaType: string; context: string; valid: boolean; warnings: string[] }>
    >(),
  },
  (t) => [
    index("schema_health_runs_ran_at_idx").on(t.ranAt),
  ],
);

export type SchemaHealthRunRow = typeof schemaHealthRunsTable.$inferSelect;
export type SchemaHealthRunInsert = typeof schemaHealthRunsTable.$inferInsert;
