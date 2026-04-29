import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const contentReportsTable = pgTable(
  "content_reports",
  {
    id: serial("id").primaryKey(),
    contentType: text("content_type").notNull(),
    contentId: text("content_id").notNull(),
    contentTitle: text("content_title"),
    contentUrl: text("content_url"),
    reporterName: text("reporter_name"),
    reporterEmail: text("reporter_email"),
    reason: text("reason").notNull(),
    details: text("details"),
    status: text("status").notNull().default("open"),
    resolvedBy: text("resolved_by"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("content_reports_status_idx").on(table.status),
    createdAtIdx: index("content_reports_created_at_idx").on(table.createdAt),
  }),
);

export type ContentReport = typeof contentReportsTable.$inferSelect;
export type NewContentReport = typeof contentReportsTable.$inferInsert;
