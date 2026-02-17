import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, isAuthenticated, requireModule, requireGlobalAdmin, authStorage } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { z } from "zod";
import { ALL_MODULES } from "@shared/models/auth";

function isClientAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && (req.session as any).clientId) {
    return next();
  }
  return res.status(401).json({ message: "Não autorizado" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  // Auth routes are registered in setupAuth

  // File Upload Routes (local storage)
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.post("/api/uploads/direct", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const objectPath = `/uploads/${req.file.filename}`;
    res.json({ objectPath });
  });

  app.put("/api/uploads/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    const writeStream = fs.createWriteStream(filePath);
    req.pipe(writeStream);
    writeStream.on("finish", () => {
      res.status(200).json({ objectPath: `/uploads/${filename}` });
    });
    writeStream.on("error", () => {
      res.status(500).json({ error: "Failed to save file" });
    });
  });

  app.post("/api/uploads/request-url", (req, res) => {
    const { name } = req.body;
    const ext = name ? path.extname(name) : ".bin";
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`;
    res.json({
      uploadURL: `/api/uploads/${uniqueName}`,
      objectPath: `/uploads/${uniqueName}`,
      metadata: req.body,
    });
  });

  app.use("/uploads", express.static(uploadDir));

  app.get("/objects/:objectPath", (req, res) => {
    const reqPath = req.params.objectPath || "";
    const filePath = path.join(uploadDir, path.basename(reqPath));
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    res.status(404).json({ error: "File not found" });
  });

  // ============================
  // CLIENT PORTAL ROUTES
  // ============================
  app.post("/api/client/login", async (req, res) => {
    try {
      const { cnpj } = req.body;
      if (!cnpj) return res.status(400).json({ message: "CNPJ é obrigatório" });
      const client = await storage.getClientByCnpj(cnpj);
      if (!client) return res.status(404).json({ message: "Cliente não encontrado. Verifique o CNPJ informado." });
      if (client.active === false) return res.status(403).json({ message: "Cliente inativo. Entre em contato com o administrador." });
      (req.session as any).clientId = client.id;
      res.json({ id: client.id, nomeFantasia: client.nomeFantasia, razaoSocial: client.razaoSocial, cnpj: client.cnpj });
    } catch (err) {
      res.status(500).json({ message: "Erro interno" });
    }
  });

  app.get("/api/client/me", isClientAuthenticated, async (req, res) => {
    const client = await storage.getClient((req.session as any).clientId);
    if (!client) return res.status(404).json({ message: "Cliente não encontrado" });
    res.json(client);
  });

  app.post("/api/client/logout", (req, res) => {
    delete (req.session as any).clientId;
    res.json({ ok: true });
  });

  app.get("/api/client/products", isClientAuthenticated, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products.filter(p => p.active));
  });

  app.get("/api/client/prices", isClientAuthenticated, async (req, res) => {
    const clientId = (req.session as any).clientId;
    const prices = await storage.getClientPrices(clientId);
    res.json(prices);
  });

  app.get("/api/client/orders", isClientAuthenticated, async (req, res) => {
    const clientId = (req.session as any).clientId;
    const orders = await storage.getOrdersByClient(clientId);
    res.json(orders);
  });

  app.post("/api/client/orders", isClientAuthenticated, async (req, res) => {
    try {
      const clientId = (req.session as any).clientId;
      const input = z.object({
        items: z.array(z.object({ productId: z.number(), quantity: z.number() }))
      }).parse(req.body);

      const order = await storage.createOrder({
        clientId,
        tripId: null,
        source: 'client',
        items: input.items
      });
      res.status(201).json(order);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Erro ao criar pedido" });
    }
  });

  app.get("/api/client/messages", isClientAuthenticated, async (req, res) => {
    const clientId = (req.session as any).clientId;
    const msgs = await storage.getMessages(clientId);
    res.json(msgs);
  });

  app.post("/api/client/messages", isClientAuthenticated, async (req, res) => {
    try {
      const clientId = (req.session as any).clientId;
      const { content } = req.body;
      if (!content) return res.status(400).json({ message: "Mensagem é obrigatória" });
      const msg = await storage.createMessage({
        clientId,
        content,
        direction: 'client_to_admin'
      });
      res.status(201).json(msg);
    } catch (err) {
      res.status(500).json({ message: "Erro ao enviar mensagem" });
    }
  });

  // ============================
  // ADMIN ROUTES (Protected by Auth)
  // ============================

  // ============================
  // ADMIN USER MANAGEMENT (Global Admin only)
  // ============================
  app.get("/api/admin/users", isAuthenticated, requireGlobalAdmin(), async (req, res) => {
    const allUsers = await authStorage.getAllUsers();
    res.json(allUsers);
  });

  app.put("/api/admin/users/:id/permissions", isAuthenticated, requireGlobalAdmin(), async (req, res) => {
    try {
      const userId = req.params.id as string;
      const input = z.object({
        role: z.enum(["admin", "global_admin"]),
        permissions: z.array(z.string()),
      }).parse(req.body);

      const validPerms = input.permissions.filter(p => (ALL_MODULES as readonly string[]).includes(p));

      const currentUser = (req.session as any)?.user?.id;
      if (userId === currentUser && input.role !== "global_admin") {
        return res.status(400).json({ message: "Você não pode remover seu próprio papel de administrador global" });
      }

      const user = await authStorage.updateUserPermissions(userId, input.role, validPerms);
      if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Erro ao atualizar permissões" });
    }
  });

  app.post("/api/admin/users", isAuthenticated, requireGlobalAdmin(), async (req, res) => {
    try {
      const input = z.object({
        email: z.string().email("Email inválido"),
        firstName: z.string().min(1, "Nome é obrigatório"),
        lastName: z.string().min(1, "Sobrenome é obrigatório"),
        username: z.string().min(3, "Usuário deve ter no mínimo 3 caracteres").optional(),
        password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
        role: z.enum(["admin", "global_admin"]).default("admin"),
        permissions: z.array(z.string()).default([]),
      }).parse(req.body);

      const validPerms = input.permissions.filter(p => (ALL_MODULES as readonly string[]).includes(p));
      const user = await authStorage.createManualUser({
        ...input,
        permissions: validPerms,
      });
      res.status(201).json(user);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === "23505") {
        return res.status(400).json({ message: "Este email já está cadastrado" });
      }
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });

  app.delete("/api/admin/users/:id", isAuthenticated, requireGlobalAdmin(), async (req, res) => {
    try {
      const userId = req.params.id as string;
      const currentUser = (req.session as any)?.user?.id;
      if (userId === currentUser) {
        return res.status(400).json({ message: "Você não pode excluir sua própria conta" });
      }
      const deleted = await authStorage.deleteUser(userId);
      if (!deleted) return res.status(404).json({ message: "Usuário não encontrado" });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  });

  // Pending client orders
  app.get("/api/admin/pending-orders", isAuthenticated, requireModule("order_requests"), async (req, res) => {
    const orders = await storage.getPendingClientOrders();
    res.json(orders);
  });

  app.post("/api/admin/orders/:id/approve", isAuthenticated, requireModule("order_requests"), async (req, res) => {
    try {
      const orderId = Number(req.params.id);
      const { tripId } = req.body;
      if (!tripId) return res.status(400).json({ message: "Viagem é obrigatória" });
      const result = await storage.approveAndAssignOrder(orderId, tripId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Erro ao aprovar pedido" });
    }
  });

  app.post("/api/admin/orders/:id/reject", isAuthenticated, requireModule("order_requests"), async (req, res) => {
    try {
      await storage.rejectOrder(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Erro ao rejeitar pedido" });
    }
  });

  // Sales Report
  app.get("/api/admin/report/sales", isAuthenticated, requireModule("reports"), async (req, res) => {
    try {
      const allOrders = await storage.getOrders();
      const allClients = await storage.getClients();
      const allClientPrices: Record<number, any[]> = {};
      for (const client of allClients) {
        allClientPrices[client.id] = await storage.getClientPrices(client.id);
      }
      res.json({ orders: allOrders, clientPrices: allClientPrices });
    } catch (err) {
      res.status(500).json({ message: "Erro ao gerar relatório" });
    }
  });

  // Messages management
  app.get("/api/admin/messages", isAuthenticated, requireModule("messages"), async (req, res) => {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const msgs = await storage.getMessages(clientId);
    res.json(msgs);
  });

  app.get("/api/admin/messages/unread", isAuthenticated, requireModule("messages"), async (req, res) => {
    const msgs = await storage.getUnreadMessages();
    res.json(msgs);
  });

  app.post("/api/admin/messages", isAuthenticated, requireModule("messages"), async (req, res) => {
    try {
      const { clientId, content } = req.body;
      if (!clientId || !content) return res.status(400).json({ message: "Cliente e mensagem são obrigatórios" });
      const msg = await storage.createMessage({
        clientId,
        content,
        direction: 'admin_to_client'
      });
      res.status(201).json(msg);
    } catch (err) {
      res.status(500).json({ message: "Erro ao enviar mensagem" });
    }
  });

  app.post("/api/admin/messages/:id/read", isAuthenticated, requireModule("messages"), async (req, res) => {
    await storage.markMessageRead(Number(req.params.id));
    res.json({ ok: true });
  });

  // Clients
  app.get(api.clients.list.path, isAuthenticated, requireModule("clients"), async (req, res) => {
    const clients = await storage.getClients();
    res.json(clients);
  });

  app.post(api.clients.create.path, isAuthenticated, requireModule("clients"), async (req, res) => {
    try {
      const input = api.clients.create.input.parse(req.body);
      const client = await storage.createClient(input);
      res.status(201).json(client);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.clients.get.path, isAuthenticated, requireModule("clients"), async (req, res) => {
    const client = await storage.getClient(Number(req.params.id));
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  });

  app.put(api.clients.update.path, isAuthenticated, requireModule("clients"), async (req, res) => {
    const input = api.clients.update.input.parse(req.body);
    const client = await storage.updateClient(Number(req.params.id), input);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  });

  app.delete(api.clients.delete.path, isAuthenticated, requireModule("clients"), async (req, res) => {
      await storage.deleteClient(Number(req.params.id));
      res.status(204).send();
  });

  app.get(api.clients.prices.list.path, isAuthenticated, requireModule("clients"), async (req, res) => {
    const prices = await storage.getClientPrices(Number(req.params.id));
    res.json(prices);
  });

  app.post(api.clients.prices.upsert.path, isAuthenticated, requireModule("clients"), async (req, res) => {
    const input = api.clients.prices.upsert.input.parse(req.body);
    const price = await storage.upsertClientPrice(input);
    res.json(price);
  });


  // Products
  app.get(api.products.list.path, isAuthenticated, requireModule("products"), async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.post(api.products.create.path, isAuthenticated, requireModule("products"), async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.products.get.path, isAuthenticated, requireModule("products"), async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.put(api.products.update.path, isAuthenticated, requireModule("products"), async (req, res) => {
    const input = api.products.update.input.parse(req.body);
    const product = await storage.updateProduct(Number(req.params.id), input);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.delete("/api/products/:id", isAuthenticated, requireModule("products"), async (req, res) => {
    try {
      await storage.deleteProduct(Number(req.params.id));
      res.status(204).send();
    } catch (err: any) {
      if (err.code === "23503") {
        return res.status(400).json({ message: "Não é possível excluir este produto pois ele está sendo usado em pedidos existentes." });
      }
      throw err;
    }
  });

  // Trips
  app.get(api.trips.list.path, isAuthenticated, requireModule("trips"), async (req, res) => {
    const trips = await storage.getTrips();
    res.json(trips);
  });

  app.post(api.trips.create.path, isAuthenticated, requireModule("trips"), async (req, res) => {
    try {
      const input = api.trips.create.input.parse(req.body);
      const trip = await storage.createTrip(input);
      res.status(201).json(trip);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.trips.get.path, isAuthenticated, requireModule("trips"), async (req, res) => {
    const trip = await storage.getTrip(Number(req.params.id));
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    res.json(trip);
  });

  app.put(api.trips.update.path, isAuthenticated, requireModule("trips"), async (req, res) => {
    const input = api.trips.update.input.parse(req.body);
    const trip = await storage.updateTrip(Number(req.params.id), input);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    res.json(trip);
  });

  // Orders
  app.get(api.orders.list.path, isAuthenticated, requireModule("orders"), async (req, res) => {
    const tripId = req.query.tripId ? Number(req.query.tripId) : undefined;
    const orders = await storage.getOrders(tripId);
    res.json(orders);
  });

  app.post(api.orders.create.path, isAuthenticated, requireModule("orders"), async (req, res) => {
    try {
      const input = api.orders.create.input.parse(req.body);
      const order = await storage.createOrder(input);
      res.status(201).json(order);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.orders.get.path, isAuthenticated, requireModule("orders"), async (req, res) => {
    const order = await storage.getOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  });

  app.put("/api/orders/:id", isAuthenticated, requireModule("orders"), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const input = z.object({
        tripId: z.number().nullable().optional(),
        clientId: z.number(),
        items: z.array(z.object({ productId: z.number(), quantity: z.number() }))
      }).parse(req.body);

      const order = await storage.updateOrder(id, { ...input, tripId: input.tripId ?? undefined });
      res.json(order);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/orders/:id", isAuthenticated, requireModule("orders"), async (req, res) => {
    await storage.deleteOrder(Number(req.params.id));
    res.status(204).send();
  });

  // Cash Flow - Update order payment
  app.put("/api/orders/:id/payment", isAuthenticated, requireModule("finance"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = z.object({
        paid: z.boolean(),
        observation: z.string().nullable().optional(),
      }).parse(req.body);

      const order = await storage.updateOrderPayment(id, input.paid, input.observation || null);
      if (!order) return res.status(404).json({ message: "Pedido não encontrado" });
      res.json(order);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Erro ao atualizar pagamento" });
    }
  });

  // Financial Entries
  app.get("/api/finance/entries", isAuthenticated, requireModule("finance"), async (req, res) => {
    const filters: any = {};
    if (req.query.type) filters.type = req.query.type as string;
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.startDate) filters.startDate = req.query.startDate as string;
    if (req.query.endDate) filters.endDate = req.query.endDate as string;
    const entries = await storage.getFinancialEntries(filters);
    res.json(entries);
  });

  app.post("/api/finance/entries", isAuthenticated, requireModule("finance"), async (req, res) => {
    try {
      const input = z.object({
        type: z.enum(["receivable", "payable"]),
        description: z.string().min(1),
        amount: z.string(),
        dueDate: z.string(),
        paidDate: z.string().nullable().optional(),
        status: z.enum(["open", "paid", "overdue"]).optional(),
        category: z.string().min(1),
        observation: z.string().nullable().optional(),
        clientId: z.number().nullable().optional(),
        tripId: z.number().nullable().optional(),
        isRecurring: z.boolean().optional(),
        recurrencePeriod: z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"]).optional(),
        recurrenceCount: z.number().min(1).max(60).optional(),
      }).parse(req.body);

      if (input.isRecurring && input.recurrencePeriod && input.recurrenceCount && input.recurrenceCount > 1) {
        const entries = [];
        const baseDate = new Date(input.dueDate + "T00:00:00");
        for (let i = 0; i < input.recurrenceCount; i++) {
          const dueDate = new Date(baseDate);
          switch (input.recurrencePeriod) {
            case "weekly":
              dueDate.setDate(dueDate.getDate() + i * 7);
              break;
            case "biweekly":
              dueDate.setDate(dueDate.getDate() + i * 14);
              break;
            case "monthly":
              dueDate.setMonth(dueDate.getMonth() + i);
              break;
            case "quarterly":
              dueDate.setMonth(dueDate.getMonth() + i * 3);
              break;
            case "yearly":
              dueDate.setFullYear(dueDate.getFullYear() + i);
              break;
          }
          const parcela = `${i + 1}/${input.recurrenceCount}`;
          const entry = await storage.createFinancialEntry({
            type: input.type,
            description: `${input.description} (${parcela})`,
            amount: input.amount,
            dueDate: dueDate.toISOString().split("T")[0],
            paidDate: null,
            status: input.status || "open",
            category: input.category,
            observation: input.observation,
            clientId: input.clientId,
            tripId: input.tripId,
          });
          entries.push(entry);
        }
        return res.status(201).json(entries);
      }

      const { isRecurring, recurrencePeriod, recurrenceCount, ...entryData } = input;
      const entry = await storage.createFinancialEntry(entryData);
      res.status(201).json(entry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Erro ao criar lançamento" });
    }
  });

  app.put("/api/finance/entries/:id", isAuthenticated, requireModule("finance"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = z.object({
        type: z.enum(["receivable", "payable"]).optional(),
        description: z.string().min(1).optional(),
        amount: z.string().optional(),
        dueDate: z.string().optional(),
        paidDate: z.string().nullable().optional(),
        status: z.enum(["open", "paid", "overdue"]).optional(),
        category: z.string().optional(),
        observation: z.string().nullable().optional(),
        clientId: z.number().nullable().optional(),
        tripId: z.number().nullable().optional(),
      }).parse(req.body);

      const entry = await storage.updateFinancialEntry(id, input);
      res.json(entry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Erro ao atualizar lançamento" });
    }
  });

  app.delete("/api/finance/entries/:id", isAuthenticated, requireModule("finance"), async (req, res) => {
    await storage.deleteFinancialEntry(Number(req.params.id));
    res.status(204).send();
  });

  // ============================
  // SHOWCASE / VITRINE ROUTES (PUBLIC)
  // ============================
  app.get("/api/vitrine/products", async (req, res) => {
    try {
      const products = await storage.getShowcaseProducts(true);
      res.json(products);
    } catch (err) {
      res.status(500).json({ message: "Erro ao carregar produtos" });
    }
  });

  app.get("/api/vitrine/products/:id", async (req, res) => {
    try {
      const product = await storage.getShowcaseProduct(parseInt(req.params.id));
      if (!product) return res.status(404).json({ message: "Produto não encontrado" });
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: "Erro ao carregar produto" });
    }
  });

  // ============================
  // ADMIN SHOWCASE MANAGEMENT ROUTES
  // ============================
  app.get("/api/admin/showcase", isAuthenticated, requireModule("products"), async (req, res) => {
    try {
      const products = await storage.getShowcaseProducts();
      res.json(products);
    } catch (err) {
      res.status(500).json({ message: "Erro ao carregar produtos da vitrine" });
    }
  });

  app.post("/api/admin/showcase", isAuthenticated, requireModule("products"), async (req, res) => {
    try {
      const { name, description, category, imageUrl, active, sortOrder } = req.body;
      if (!name || !category) {
        return res.status(400).json({ message: "Nome e tamanho são obrigatórios" });
      }
      const product = await storage.createShowcaseProduct({
        name, description: description || null, category,
        imageUrl: imageUrl || null, active: active !== false, sortOrder: sortOrder || 0
      });
      res.status(201).json(product);
    } catch (err) {
      res.status(500).json({ message: "Erro ao criar produto da vitrine" });
    }
  });

  app.put("/api/admin/showcase/:id", isAuthenticated, requireModule("products"), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { name, description, category, imageUrl, active, sortOrder } = req.body;
      const product = await storage.updateShowcaseProduct(id, {
        name, description, category, imageUrl, active, sortOrder
      });
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: "Erro ao atualizar produto da vitrine" });
    }
  });

  app.delete("/api/admin/showcase/:id", isAuthenticated, requireModule("products"), async (req, res) => {
    try {
      await storage.deleteShowcaseProduct(parseInt(req.params.id as string));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Erro ao excluir produto da vitrine" });
    }
  });

  // ============================
  // PUBLIC SITE SETTINGS & SLIDES
  // ============================
  app.get("/api/vitrine/settings", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      const map: Record<string, string> = {};
      settings.forEach(s => { map[s.key] = s.value; });
      res.json(map);
    } catch (err) {
      res.status(500).json({ message: "Erro ao carregar configurações" });
    }
  });

  app.get("/api/vitrine/slides", async (req, res) => {
    try {
      const slides = await storage.getHeroSlides(true);
      res.json(slides);
    } catch (err) {
      res.status(500).json({ message: "Erro ao carregar slides" });
    }
  });

  // ============================
  // ADMIN SITE SETTINGS
  // ============================
  app.get("/api/admin/site-settings", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      const map: Record<string, string> = {};
      settings.forEach(s => { map[s.key] = s.value; });
      res.json(map);
    } catch (err) {
      res.status(500).json({ message: "Erro ao carregar configurações" });
    }
  });

  app.put("/api/admin/site-settings", isAuthenticated, async (req, res) => {
    try {
      const entries = req.body as Record<string, string>;
      for (const [key, value] of Object.entries(entries)) {
        await storage.upsertSiteSetting(key, value);
      }
      const settings = await storage.getSiteSettings();
      const map: Record<string, string> = {};
      settings.forEach(s => { map[s.key] = s.value; });
      res.json(map);
    } catch (err) {
      res.status(500).json({ message: "Erro ao salvar configurações" });
    }
  });

  // ============================
  // ADMIN HERO SLIDES
  // ============================
  app.get("/api/admin/slides", isAuthenticated, async (req, res) => {
    try {
      const slides = await storage.getHeroSlides();
      res.json(slides);
    } catch (err) {
      res.status(500).json({ message: "Erro ao carregar slides" });
    }
  });

  app.post("/api/admin/slides", isAuthenticated, async (req, res) => {
    try {
      const { title, subtitle, buttonText, buttonLink, imageUrl, sortOrder, active } = req.body;
      if (!title) return res.status(400).json({ message: "Título é obrigatório" });
      const slide = await storage.createHeroSlide({
        title, subtitle: subtitle || null, buttonText: buttonText || null,
        buttonLink: buttonLink || null, imageUrl: imageUrl || null,
        sortOrder: sortOrder || 0, active: active !== false
      });
      res.status(201).json(slide);
    } catch (err) {
      res.status(500).json({ message: "Erro ao criar slide" });
    }
  });

  app.put("/api/admin/slides/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { title, subtitle, buttonText, buttonLink, imageUrl, sortOrder, active } = req.body;
      const slide = await storage.updateHeroSlide(id, {
        title, subtitle, buttonText, buttonLink, imageUrl, sortOrder, active
      });
      res.json(slide);
    } catch (err) {
      res.status(500).json({ message: "Erro ao atualizar slide" });
    }
  });

  app.delete("/api/admin/slides/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteHeroSlide(parseInt(req.params.id as string));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Erro ao excluir slide" });
    }
  });

  // Contact Submissions - Public
  app.post("/api/vitrine/contact", async (req, res) => {
    try {
      const { name, email, phone, subject, message } = req.body;
      if (!name || !subject || !message) {
        return res.status(400).json({ message: "Nome, assunto e mensagem são obrigatórios" });
      }
      const submission = await storage.createContactSubmission({
        name, email: email || null, phone: phone || null, subject, message
      });
      res.status(201).json(submission);
    } catch (err) {
      res.status(500).json({ message: "Erro ao enviar mensagem de contato" });
    }
  });

  // Contact Submissions - Admin
  app.get("/api/admin/contact-submissions", isAuthenticated, async (req, res) => {
    try {
      const submissions = await storage.getContactSubmissions();
      res.json(submissions);
    } catch (err) {
      res.status(500).json({ message: "Erro ao carregar mensagens de contato" });
    }
  });

  app.get("/api/admin/contact-submissions/unread-count", isAuthenticated, async (req, res) => {
    try {
      const count = await storage.getUnreadContactCount();
      res.json({ count });
    } catch (err) {
      res.status(500).json({ message: "Erro ao contar mensagens não lidas" });
    }
  });

  app.put("/api/admin/contact-submissions/:id/read", isAuthenticated, async (req, res) => {
    try {
      await storage.markContactSubmissionRead(parseInt(req.params.id as string));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Erro ao marcar mensagem como lida" });
    }
  });

  app.delete("/api/admin/contact-submissions/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteContactSubmission(parseInt(req.params.id as string));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Erro ao excluir mensagem de contato" });
    }
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      const settingsMap: Record<string, string> = {};
      settings.forEach(s => { settingsMap[s.key] = s.value; });
      const baseUrl = settingsMap.siteUrl || `https://${req.headers.host}`;

      const products = await storage.getShowcaseProducts(true);

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      const pages = [
        { loc: '/', priority: '1.0', changefreq: 'weekly' },
        { loc: '/produtos', priority: '0.9', changefreq: 'weekly' },
        { loc: '/sobre', priority: '0.7', changefreq: 'monthly' },
        { loc: '/contato', priority: '0.7', changefreq: 'monthly' },
      ];

      for (const page of pages) {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}${page.loc}</loc>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += '  </url>\n';
      }

      for (const product of products) {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/produto/${product.id}</loc>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += '  </url>\n';
      }

      xml += '</urlset>';

      res.set('Content-Type', 'application/xml');
      res.send(xml);
    } catch (err) {
      res.status(500).send('Error generating sitemap');
    }
  });

  app.get("/robots.txt", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      const settingsMap: Record<string, string> = {};
      settings.forEach(s => { settingsMap[s.key] = s.value; });
      const baseUrl = settingsMap.siteUrl || `https://${req.headers.host}`;

      let txt = 'User-agent: *\n';
      txt += 'Allow: /\n';
      txt += 'Allow: /produtos\n';
      txt += 'Allow: /sobre\n';
      txt += 'Allow: /contato\n';
      txt += 'Allow: /produto/\n';
      txt += 'Disallow: /api/\n';
      txt += 'Disallow: /login\n';
      txt += 'Disallow: /portal/\n';
      txt += 'Disallow: /painel/\n';
      txt += '\n';
      txt += `Sitemap: ${baseUrl}/sitemap.xml\n`;

      res.set('Content-Type', 'text/plain');
      res.send(txt);
    } catch (err) {
      res.status(500).send('Error generating robots.txt');
    }
  });

  // Seed Data
  if ((await storage.getClients()).length === 0) {
    await storage.createClient({
      razaoSocial: "Exemplo Ltda",
      nomeFantasia: "Loja Exemplo",
      cnpj: "00.000.000/0001-00",
      inscricaoEstadual: "ISENTO",
      cep: "01001-000",
      logradouro: "Rua Exemplo",
      numero: "123",
      bairro: "Centro",
      cidade: "São Paulo",
      estado: "SP",
      telefones: "1199999999",
      email: "contato@exemplo.com",
      responsavel: "João Silva"
    });
    await storage.createProduct({ name: "Produto", color: "Branca", size: "GRANDE" });
    await storage.createProduct({ name: "Produto", color: "Azul", size: "MÉDIA" });
    await storage.createTrip({ name: "Viagem Inicial", startDate: new Date().toISOString().split('T')[0] });
  }

  return httpServer;
}
