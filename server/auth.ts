import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import type { ModuleKey } from "@shared/models/auth";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Usuário e senha são obrigatórios" });
      }

      const allUsers = await db.select().from(users);
      const user = allUsers.find(u => u.username === username || u.email === username);
      
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Usuário ou senha inválidos" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Usuário ou senha inválidos" });
      }

      (req.session as any).userId = user.id;
      (req.session as any).user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        permissions: user.permissions,
        username: user.username,
      };

      res.json((req.session as any).user);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/login");
    });
  });

  app.get("/api/auth/user", (req: Request, res: Response) => {
    const user = (req.session as any)?.user;
    if (!user) {
      return res.status(401).json({ message: "Não autorizado" });
    }
    res.json(user);
  });

  const allUsers = await db.select().from(users);
  const hasUsersWithPassword = allUsers.some(u => u.passwordHash);
  if (!hasUsersWithPassword) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    if (allUsers.length === 0) {
      await db.insert(users).values({
        username: "admin",
        email: "admin@empresa.com",
        firstName: "Administrador",
        lastName: "",
        passwordHash: hashedPassword,
        role: "global_admin",
        permissions: ["dashboard", "order_requests", "trips", "orders", "clients", "products", "finance", "messages", "reports"],
      });
      console.log("Usuário admin criado - Login: admin, Senha: admin123");
    } else {
      const globalAdmin = allUsers.find(u => u.role === "global_admin") || allUsers[0];
      await db.update(users).set({
        username: "admin",
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      }).where(eq(users.id, globalAdmin.id));
      console.log(`Senha definida para usuário ${globalAdmin.email || globalAdmin.id} - Login: admin, Senha: admin123`);
    }
  }
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  const user = (req.session as any)?.user;
  if (!user) {
    return res.status(401).json({ message: "Não autorizado" });
  }
  next();
};

export function requireModule(moduleKey: ModuleKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionUser = (req.session as any)?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Não autorizado" });
      }
      const [dbUser] = await db.select().from(users).where(eq(users.id, sessionUser.id));
      if (!dbUser) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }
      if (dbUser.role === "global_admin") {
        return next();
      }
      const perms = (dbUser.permissions as string[]) || [];
      if (perms.includes(moduleKey)) {
        return next();
      }
      return res.status(403).json({ message: "Sem permissão para acessar este módulo" });
    } catch {
      return res.status(500).json({ message: "Erro ao verificar permissões" });
    }
  };
}

export function requireGlobalAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionUser = (req.session as any)?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Não autorizado" });
      }
      const [dbUser] = await db.select().from(users).where(eq(users.id, sessionUser.id));
      if (!dbUser || dbUser.role !== "global_admin") {
        return res.status(403).json({ message: "Acesso restrito ao administrador global" });
      }
      return next();
    } catch {
      return res.status(500).json({ message: "Erro ao verificar permissões" });
    }
  };
}

export const authStorage = {
  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },
  async getAllUsers() {
    return db.select().from(users);
  },
  async updateUserPermissions(id: string, role: string, permissions: string[]) {
    const [user] = await db.update(users).set({ role, permissions, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  },
  async createManualUser(data: { email: string; firstName: string; lastName: string; role: string; permissions: string[]; username?: string; password?: string }) {
    const values: any = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      permissions: data.permissions,
    };
    if (data.username) values.username = data.username;
    if (data.password) {
      values.passwordHash = await bcrypt.hash(data.password, 10);
    }
    const [user] = await db.insert(users).values(values).returning();
    return user;
  },
  async deleteUser(id: string) {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  },
  async upsertUser(userData: any) {
    const existingById = userData.id ? await this.getUser(userData.id) : undefined;
    if (existingById) {
      const [user] = await db.update(users).set({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        updatedAt: new Date(),
      }).where(eq(users.id, userData.id)).returning();
      return user;
    }
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: { email: userData.email, firstName: userData.firstName, lastName: userData.lastName, profileImageUrl: userData.profileImageUrl, updatedAt: new Date() },
    }).returning();
    return user;
  },
};
