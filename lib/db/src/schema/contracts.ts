import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";

export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("full-time"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  rate: numeric("rate", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("USD"),
  paymentStatus: text("payment_status").notNull().default("paid"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Contract = typeof contractsTable.$inferSelect;
