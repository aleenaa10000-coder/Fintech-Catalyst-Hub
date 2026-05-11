import { pgTable, serial, integer, boolean, text, timestamp, jsonb } from "drizzle-orm/pg-core";

/**
 * One row per schema health check execution — both scheduled daily runs and
 * admin-triggered "send now" clicks. Provides a rolling history the admin
 * panel can surface as a timeline so regressions are traceable over time.
 */
export const schemaHealthRunsTable = pgTable("schema_health_runs", {
  id:         serial("id").primaryKey(),
  ranAt:      timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
  // "scheduled" | "manual"
  trigger:    text("trigger").notNull().default("scheduled"),
  total:      integer("total").notNull().default(0),
  passed:     integer("passed").notNull().default(0),
  failures:   integer("failures").notNull().default(0),
  warnings:   integer("warnings").notNull().default(0),
  // Whether an alert email was dispatched for this run.
  emailSent:  boolean("email_sent").notNull().default(false),
  // "all_healthy" | "no_recipients" | "build_error" | null (sent)
  skipReason: text("skip_reason"),
  // Compact snapshot of any failing/warning schema types — stored so the
  // history list can show which types were affected without re-running.
  issues: jsonb("issues").$type<
    Array<{ schemaType: string; context: string; valid: boolean; warnings: string[] }>
  >(),
});

export type SchemaHealthRunRow = typeof schemaHealthRunsTable.$inferSelect;
export type SchemaHealthRunInsert = typeof schemaHealthRunsTable.$inferInsert;
