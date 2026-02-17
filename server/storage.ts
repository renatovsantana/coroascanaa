import { db } from "./db";
import {
  clients, products, trips, orders, orderItems, clientPrices, messages, financialEntries, showcaseProducts, siteSettings, heroSlides, contactSubmissions,
  type Client, type InsertClient,
  type Product, type InsertProduct,
  type Trip, type InsertTrip,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type ClientPrice, type InsertClientPrice,
  type Message, type InsertMessage,
  type FinancialEntry, type InsertFinancialEntry,
  type ShowcaseProduct, type InsertShowcaseProduct,
  type SiteSetting, type InsertSiteSetting,
  type HeroSlide, type InsertHeroSlide,
  type ContactSubmission, type InsertContactSubmission,
  type CreateOrderRequest
} from "@shared/schema";
import { eq, desc, and, isNull, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  getClientByCnpj(cnpj: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;

  // Client Prices
  getClientPrices(clientId: number): Promise<ClientPrice[]>;
  upsertClientPrice(price: InsertClientPrice): Promise<ClientPrice>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Trips
  getTrips(): Promise<Trip[]>;
  getTrip(id: number): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: number, trip: Partial<InsertTrip>): Promise<Trip>;

  // Orders
  getOrders(tripId?: number): Promise<any[]>;
  getOrder(id: number): Promise<any | undefined>;
  getPendingClientOrders(): Promise<any[]>;
  getOrdersByClient(clientId: number): Promise<any[]>;
  createOrder(req: CreateOrderRequest): Promise<any>;
  updateOrder(id: number, req: CreateOrderRequest): Promise<any>;
  deleteOrder(id: number): Promise<void>;
  approveAndAssignOrder(orderId: number, tripId: number): Promise<any>;
  rejectOrder(orderId: number): Promise<void>;
  updateOrderPayment(id: number, paid: boolean, observation: string | null): Promise<any>;

  // Financial Entries
  getFinancialEntries(filters?: { type?: string; status?: string; startDate?: string; endDate?: string }): Promise<any[]>;
  getFinancialEntry(id: number): Promise<any | undefined>;
  createFinancialEntry(entry: InsertFinancialEntry): Promise<FinancialEntry>;
  updateFinancialEntry(id: number, entry: Partial<InsertFinancialEntry>): Promise<FinancialEntry>;
  deleteFinancialEntry(id: number): Promise<void>;

  // Messages
  getMessages(clientId?: number): Promise<Message[]>;
  getUnreadMessages(): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;
  markMessageRead(id: number): Promise<void>;

  // Showcase Products
  getShowcaseProducts(activeOnly?: boolean): Promise<ShowcaseProduct[]>;
  getShowcaseProduct(id: number): Promise<ShowcaseProduct | undefined>;
  createShowcaseProduct(product: InsertShowcaseProduct): Promise<ShowcaseProduct>;
  updateShowcaseProduct(id: number, product: Partial<InsertShowcaseProduct>): Promise<ShowcaseProduct>;
  deleteShowcaseProduct(id: number): Promise<void>;

  // Site Settings
  getSiteSettings(): Promise<SiteSetting[]>;
  getSiteSetting(key: string): Promise<SiteSetting | undefined>;
  upsertSiteSetting(key: string, value: string): Promise<SiteSetting>;

  // Hero Slides
  getHeroSlides(activeOnly?: boolean): Promise<HeroSlide[]>;
  getHeroSlide(id: number): Promise<HeroSlide | undefined>;
  createHeroSlide(slide: InsertHeroSlide): Promise<HeroSlide>;
  updateHeroSlide(id: number, slide: Partial<InsertHeroSlide>): Promise<HeroSlide>;
  deleteHeroSlide(id: number): Promise<void>;

  // Contact Submissions
  getContactSubmissions(): Promise<ContactSubmission[]>;
  getContactSubmission(id: number): Promise<ContactSubmission | undefined>;
  createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;
  markContactSubmissionRead(id: number): Promise<void>;
  deleteContactSubmission(id: number): Promise<void>;
  getUnreadContactCount(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // Clients
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.id));
  }
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }
  async getClientByCnpj(cnpj: string): Promise<Client | undefined> {
    const allClients = await db.select().from(clients);
    const normalized = cnpj.replace(/\D/g, '');
    return allClients.find(c => c.cnpj.replace(/\D/g, '') === normalized);
  }
  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }
  async updateClient(id: number, update: Partial<InsertClient>): Promise<Client> {
    const [client] = await db.update(clients).set(update).where(eq(clients.id, id)).returning();
    return client;
  }
  async deleteClient(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      const clientOrders = await tx.select().from(orders).where(eq(orders.clientId, id));
      for (const order of clientOrders) {
        await tx.delete(orderItems).where(eq(orderItems.orderId, order.id));
      }
      await tx.delete(orders).where(eq(orders.clientId, id));
      await tx.delete(clientPrices).where(eq(clientPrices.clientId, id));
      await tx.delete(messages).where(eq(messages.clientId, id));
      await tx.delete(clients).where(eq(clients.id, id));
    });
  }

  // Client Prices
  async getClientPrices(clientId: number): Promise<ClientPrice[]> {
    return await db.select().from(clientPrices).where(eq(clientPrices.clientId, clientId));
  }

  async upsertClientPrice(insertPrice: InsertClientPrice): Promise<ClientPrice> {
    const [existing] = await db
      .select()
      .from(clientPrices)
      .where(
        and(
          eq(clientPrices.clientId, insertPrice.clientId),
          eq(clientPrices.size, insertPrice.size)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(clientPrices)
        .set({ price: insertPrice.price })
        .where(eq(clientPrices.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(clientPrices).values(insertPrice).returning();
    return created;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.id));
  }
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }
  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }
  async updateProduct(id: number, update: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db.update(products).set(update).where(eq(products.id, id)).returning();
    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Trips
  async getTrips(): Promise<Trip[]> {
    return await db.select().from(trips).orderBy(desc(trips.startDate));
  }
  async getTrip(id: number): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    return trip;
  }
  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const [trip] = await db.insert(trips).values(insertTrip).returning();
    return trip;
  }
  async updateTrip(id: number, update: Partial<InsertTrip>): Promise<Trip> {
    const [trip] = await db.update(trips).set(update).where(eq(trips.id, id)).returning();
    return trip;
  }

  // Orders
  async getOrders(tripId?: number): Promise<any[]> {
    const query = db.query.orders.findMany({
      where: tripId ? eq(orders.tripId, tripId) : undefined,
      with: {
        client: true,
        trip: true,
        items: {
          with: {
            product: true
          }
        }
      },
      orderBy: desc(orders.createdAt)
    });
    return await query;
  }

  async getOrder(id: number): Promise<any | undefined> {
    return await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        client: true,
        trip: true,
        items: {
          with: {
            product: true
          }
        }
      }
    });
  }

  async getPendingClientOrders(): Promise<any[]> {
    return await db.query.orders.findMany({
      where: and(
        eq(orders.source, 'client'),
        isNull(orders.tripId)
      ),
      with: {
        client: true,
        items: {
          with: {
            product: true
          }
        }
      },
      orderBy: desc(orders.createdAt)
    });
  }

  async getOrdersByClient(clientId: number): Promise<any[]> {
    return await db.query.orders.findMany({
      where: eq(orders.clientId, clientId),
      with: {
        trip: true,
        items: {
          with: {
            product: true
          }
        }
      },
      orderBy: desc(orders.createdAt)
    });
  }

  async createOrder(req: CreateOrderRequest): Promise<any> {
    return await db.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values({
        tripId: req.tripId || null,
        clientId: req.clientId,
        source: (req.source as "admin" | "client") || 'admin',
      }).returning();

      if (req.items.length > 0) {
        await tx.insert(orderItems).values(
          req.items.map(item => ({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity
          }))
        );
      }

      return await tx.query.orders.findFirst({
        where: eq(orders.id, order.id),
        with: {
          client: true,
          trip: true,
          items: {
            with: {
              product: true
            }
          }
        }
      });
    });
  }

  async updateOrder(id: number, req: CreateOrderRequest): Promise<any> {
    return await db.transaction(async (tx) => {
      await tx.update(orders).set({
        tripId: req.tripId || null,
        clientId: req.clientId,
      }).where(eq(orders.id, id));

      await tx.delete(orderItems).where(eq(orderItems.orderId, id));

      if (req.items.length > 0) {
        await tx.insert(orderItems).values(
          req.items.map(item => ({
            orderId: id,
            productId: item.productId,
            quantity: item.quantity
          }))
        );
      }

      return await tx.query.orders.findFirst({
        where: eq(orders.id, id),
        with: {
          client: true,
          trip: true,
          items: {
            with: {
              product: true
            }
          }
        }
      });
    });
  }

  async deleteOrder(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(orderItems).where(eq(orderItems.orderId, id));
      await tx.delete(orders).where(eq(orders.id, id));
    });
  }

  async approveAndAssignOrder(orderId: number, tripId: number): Promise<any> {
    return await db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: { items: true }
      });
      if (!order) throw new Error("Pedido não encontrado");

      const existingOrder = await tx.query.orders.findFirst({
        where: and(
          eq(orders.tripId, tripId),
          eq(orders.clientId, order.clientId)
        ),
        with: { items: true }
      });

      if (existingOrder && existingOrder.id !== orderId) {
        for (const newItem of order.items) {
          const existingItem = existingOrder.items.find(
            (ei: any) => ei.productId === newItem.productId
          );
          if (existingItem) {
            await tx.update(orderItems)
              .set({ quantity: existingItem.quantity + newItem.quantity })
              .where(eq(orderItems.id, existingItem.id));
          } else {
            await tx.insert(orderItems).values({
              orderId: existingOrder.id,
              productId: newItem.productId,
              quantity: newItem.quantity
            });
          }
        }
        await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));
        await tx.delete(orders).where(eq(orders.id, orderId));

        return await tx.query.orders.findFirst({
          where: eq(orders.id, existingOrder.id),
          with: {
            client: true,
            trip: true,
            items: { with: { product: true } }
          }
        });
      } else {
        await tx.update(orders).set({
          tripId: tripId,
        }).where(eq(orders.id, orderId));

        return await tx.query.orders.findFirst({
          where: eq(orders.id, orderId),
          with: {
            client: true,
            trip: true,
            items: { with: { product: true } }
          }
        });
      }
    });
  }

  async rejectOrder(orderId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));
      await tx.delete(orders).where(eq(orders.id, orderId));
    });
  }

  async updateOrderPayment(id: number, paid: boolean, observation: string | null): Promise<any> {
    await db.update(orders).set({
      paid,
      observation: observation || null,
    }).where(eq(orders.id, id));

    return await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        client: true,
        trip: true,
        items: {
          with: {
            product: true
          }
        }
      }
    });
  }

  // Financial Entries
  async getFinancialEntries(filters?: { type?: string; status?: string; startDate?: string; endDate?: string }): Promise<any[]> {
    const conditions = [];
    if (filters?.type) {
      conditions.push(eq(financialEntries.type, filters.type as "receivable" | "payable"));
    }
    if (filters?.status) {
      conditions.push(eq(financialEntries.status, filters.status as "open" | "paid" | "overdue"));
    }
    if (filters?.startDate) {
      conditions.push(gte(financialEntries.dueDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(financialEntries.dueDate, filters.endDate));
    }

    return await db.query.financialEntries.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: { client: true, trip: true },
      orderBy: [desc(financialEntries.dueDate)],
    });
  }

  async getFinancialEntry(id: number): Promise<any | undefined> {
    return await db.query.financialEntries.findFirst({
      where: eq(financialEntries.id, id),
      with: { client: true, trip: true },
    });
  }

  async createFinancialEntry(entry: InsertFinancialEntry): Promise<FinancialEntry> {
    const [created] = await db.insert(financialEntries).values(entry).returning();
    return created;
  }

  async updateFinancialEntry(id: number, entry: Partial<InsertFinancialEntry>): Promise<FinancialEntry> {
    const [updated] = await db.update(financialEntries).set(entry).where(eq(financialEntries.id, id)).returning();
    return updated;
  }

  async deleteFinancialEntry(id: number): Promise<void> {
    await db.delete(financialEntries).where(eq(financialEntries.id, id));
  }

  // Messages
  async getMessages(clientId?: number): Promise<Message[]> {
    if (clientId) {
      return await db.select().from(messages)
        .where(eq(messages.clientId, clientId))
        .orderBy(desc(messages.createdAt));
    }
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async getUnreadMessages(): Promise<Message[]> {
    return await db.select().from(messages)
      .where(and(
        eq(messages.direction, 'client_to_admin'),
        eq(messages.read, false)
      ))
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(msg).returning();
    return message;
  }

  async markMessageRead(id: number): Promise<void> {
    await db.update(messages).set({ read: true }).where(eq(messages.id, id));
  }

  // Showcase Products
  async getShowcaseProducts(activeOnly?: boolean): Promise<ShowcaseProduct[]> {
    if (activeOnly) {
      return await db.select().from(showcaseProducts)
        .where(eq(showcaseProducts.active, true))
        .orderBy(showcaseProducts.sortOrder, desc(showcaseProducts.id));
    }
    return await db.select().from(showcaseProducts).orderBy(showcaseProducts.sortOrder, desc(showcaseProducts.id));
  }

  async getShowcaseProduct(id: number): Promise<ShowcaseProduct | undefined> {
    const [product] = await db.select().from(showcaseProducts).where(eq(showcaseProducts.id, id));
    return product;
  }

  async createShowcaseProduct(product: InsertShowcaseProduct): Promise<ShowcaseProduct> {
    const [created] = await db.insert(showcaseProducts).values(product).returning();
    return created;
  }

  async updateShowcaseProduct(id: number, product: Partial<InsertShowcaseProduct>): Promise<ShowcaseProduct> {
    const [updated] = await db.update(showcaseProducts).set(product).where(eq(showcaseProducts.id, id)).returning();
    return updated;
  }

  async deleteShowcaseProduct(id: number): Promise<void> {
    await db.delete(showcaseProducts).where(eq(showcaseProducts.id, id));
  }

  // Site Settings
  async getSiteSettings(): Promise<SiteSetting[]> {
    return await db.select().from(siteSettings);
  }

  async getSiteSetting(key: string): Promise<SiteSetting | undefined> {
    const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return setting;
  }

  async upsertSiteSetting(key: string, value: string): Promise<SiteSetting> {
    const existing = await this.getSiteSetting(key);
    if (existing) {
      const [updated] = await db.update(siteSettings).set({ value }).where(eq(siteSettings.key, key)).returning();
      return updated;
    }
    const [created] = await db.insert(siteSettings).values({ key, value }).returning();
    return created;
  }

  // Hero Slides
  async getHeroSlides(activeOnly?: boolean): Promise<HeroSlide[]> {
    if (activeOnly) {
      return await db.select().from(heroSlides)
        .where(eq(heroSlides.active, true))
        .orderBy(heroSlides.sortOrder, desc(heroSlides.id));
    }
    return await db.select().from(heroSlides).orderBy(heroSlides.sortOrder, desc(heroSlides.id));
  }

  async getHeroSlide(id: number): Promise<HeroSlide | undefined> {
    const [slide] = await db.select().from(heroSlides).where(eq(heroSlides.id, id));
    return slide;
  }

  async createHeroSlide(slide: InsertHeroSlide): Promise<HeroSlide> {
    const [created] = await db.insert(heroSlides).values(slide).returning();
    return created;
  }

  async updateHeroSlide(id: number, slide: Partial<InsertHeroSlide>): Promise<HeroSlide> {
    const [updated] = await db.update(heroSlides).set(slide).where(eq(heroSlides.id, id)).returning();
    return updated;
  }

  async deleteHeroSlide(id: number): Promise<void> {
    await db.delete(heroSlides).where(eq(heroSlides.id, id));
  }

  // Contact Submissions
  async getContactSubmissions(): Promise<ContactSubmission[]> {
    return await db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt));
  }

  async getContactSubmission(id: number): Promise<ContactSubmission | undefined> {
    const [submission] = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, id));
    return submission;
  }

  async createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission> {
    const [created] = await db.insert(contactSubmissions).values(submission).returning();
    return created;
  }

  async markContactSubmissionRead(id: number): Promise<void> {
    await db.update(contactSubmissions).set({ read: true }).where(eq(contactSubmissions.id, id));
  }

  async deleteContactSubmission(id: number): Promise<void> {
    await db.delete(contactSubmissions).where(eq(contactSubmissions.id, id));
  }

  async getUnreadContactCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(contactSubmissions).where(eq(contactSubmissions.read, false));
    return Number(result[0]?.count || 0);
  }
}

export const storage = new DatabaseStorage();
