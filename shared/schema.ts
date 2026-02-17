import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
export * from "./models/auth";

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  razaoSocial: text("razao_social").notNull(),
  nomeFantasia: text("nome_fantasia").notNull(),
  cnpj: text("cnpj").notNull(),
  inscricaoEstadual: text("inscricao_estadual"),
  cep: text("cep"),
  logradouro: text("logradouro").notNull(),
  numero: text("numero").notNull(),
  bairro: text("bairro"),
  cidade: text("cidade").notNull(),
  estado: text("estado").notNull(),
  telefones: text("telefones").notNull(),
  email: text("email").notNull(),
  responsavel: text("responsavel").notNull(),
  active: boolean("active").default(true),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  size: text("size").notNull(),
  active: boolean("active").default(true),
});

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: text("status", { enum: ["open", "closed"] }).default("open").notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  source: text("source", { enum: ["admin", "client"] }).default("admin").notNull(),
  paid: boolean("paid").default(false).notNull(),
  paymentMethod: text("payment_method"),
  observation: text("observation"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
});

export const clientPrices = pgTable("client_prices", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  size: text("size").notNull(),
  price: text("price").notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  content: text("content").notNull(),
  direction: text("direction", { enum: ["client_to_admin", "admin_to_client"] }).notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const financialEntries = pgTable("financial_entries", {
  id: serial("id").primaryKey(),
  type: text("type", { enum: ["receivable", "payable"] }).notNull(),
  description: text("description").notNull(),
  amount: text("amount").notNull(),
  dueDate: date("due_date").notNull(),
  paidDate: date("paid_date"),
  status: text("status", { enum: ["open", "paid", "overdue"] }).default("open").notNull(),
  category: text("category").notNull(),
  observation: text("observation"),
  clientId: integer("client_id").references(() => clients.id),
  tripId: integer("trip_id").references(() => trips.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const showcaseProducts = pgTable("showcase_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  active: boolean("active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const heroSlides = pgTable("hero_slides", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  buttonText: text("button_text"),
  buttonLink: text("button_link"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  orders: many(orders),
  prices: many(clientPrices),
  messages: many(messages),
}));

export const clientPricesRelations = relations(clientPrices, ({ one }) => ({
  client: one(clients, {
    fields: [clientPrices.clientId],
    references: [clients.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  trip: one(trips, {
    fields: [orders.tripId],
    references: [trips.id],
  }),
  client: one(clients, {
    fields: [orders.clientId],
    references: [clients.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const tripsRelations = relations(trips, ({ many }) => ({
  orders: many(orders),
  financialEntries: many(financialEntries),
}));

export const financialEntriesRelations = relations(financialEntries, ({ one }) => ({
  client: one(clients, {
    fields: [financialEntries.clientId],
    references: [clients.id],
  }),
  trip: one(trips, {
    fields: [financialEntries.tripId],
    references: [trips.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  client: one(clients, {
    fields: [messages.clientId],
    references: [clients.id],
  }),
}));

// Schemas
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertTripSchema = createInsertSchema(trips).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertClientPriceSchema = createInsertSchema(clientPrices).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, read: true });
export const insertFinancialEntrySchema = createInsertSchema(financialEntries).omit({ id: true, createdAt: true });
export const insertShowcaseProductSchema = createInsertSchema(showcaseProducts).omit({ id: true, createdAt: true });
export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({ id: true });
export const insertHeroSlideSchema = createInsertSchema(heroSlides).omit({ id: true, createdAt: true });
export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({ id: true, createdAt: true, read: true });

// Types
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type ClientPrice = typeof clientPrices.$inferSelect;
export type InsertClientPrice = z.infer<typeof insertClientPriceSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type FinancialEntry = typeof financialEntries.$inferSelect;
export type InsertFinancialEntry = z.infer<typeof insertFinancialEntrySchema>;

export type ShowcaseProduct = typeof showcaseProducts.$inferSelect;
export type InsertShowcaseProduct = z.infer<typeof insertShowcaseProductSchema>;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;
export type HeroSlide = typeof heroSlides.$inferSelect;
export type InsertHeroSlide = z.infer<typeof insertHeroSlideSchema>;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;

export type CreateOrderRequest = {
  tripId?: number | null;
  clientId: number;
  source?: string;
  items: { productId: number; quantity: number }[];
};
