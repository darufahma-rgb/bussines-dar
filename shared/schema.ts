import { pgTable, uuid, text, timestamp, pgEnum, boolean, numeric, date, unique, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const customerStatusEnum = pgEnum("customer_status", ["new", "warm", "hot", "negotiation", "closed", "lost"]);
export const interactionTypeEnum = pgEnum("interaction_type", ["note", "transaction", "follow_up", "quick_capture"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#6B7280"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  status: customerStatusEnum("status").notNull().default("new"),
  tags: text("tags").array().default(sql`'{}'`),
  source: text("source"),
  estimatedValue: numeric("estimated_value"),
  lostReason: text("lost_reason"),
  memory: text("memory"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_customers_status").on(t.status),
  index("idx_customers_name").on(t.name),
]);

export const customerBusinesses = pgTable("customer_businesses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
}, (t) => [
  unique().on(t.customerId, t.businessId),
  index("idx_customer_businesses_customer").on(t.customerId),
  index("idx_customer_businesses_business").on(t.businessId),
]);

export const interactions = pgTable("interactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  type: interactionTypeEnum("type").notNull(),
  content: text("content").notNull(),
  amount: numeric("amount"),
  currency: text("currency").default("IDR"),
  followUpDate: date("follow_up_date"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_interactions_customer_id").on(t.customerId),
  index("idx_interactions_type").on(t.type),
  index("idx_interactions_follow_up_date").on(t.followUpDate),
  index("idx_interactions_is_completed").on(t.isCompleted),
]);

export const customerFiles = pgTable("customer_files", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: text("file_size").notNull(),
  category: text("category").notNull().default("berkas"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_customer_files_customer").on(t.customerId),
]);

export type User = typeof users.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type CustomerBusiness = typeof customerBusinesses.$inferSelect;
export type Interaction = typeof interactions.$inferSelect;
export type CustomerFile = typeof customerFiles.$inferSelect;
export type CustomerStatus = "new" | "warm" | "hot" | "negotiation" | "closed" | "lost";
export type InteractionType = "note" | "transaction" | "follow_up" | "quick_capture";
