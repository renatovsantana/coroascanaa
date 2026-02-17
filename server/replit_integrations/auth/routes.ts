import type { Express, Request, Response, NextFunction } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import type { ModuleKey } from "@shared/models/auth";

export function requireModule(moduleKey: ModuleKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      if (!user?.claims?.sub) {
        return res.status(401).json({ message: "Não autorizado" });
      }
      const dbUser = await authStorage.getUser(user.claims.sub);
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
      const user = req.user as any;
      if (!user?.claims?.sub) {
        return res.status(401).json({ message: "Não autorizado" });
      }
      const dbUser = await authStorage.getUser(user.claims.sub);
      if (!dbUser || dbUser.role !== "global_admin") {
        return res.status(403).json({ message: "Acesso restrito ao administrador global" });
      }
      return next();
    } catch {
      return res.status(500).json({ message: "Erro ao verificar permissões" });
    }
  };
}

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
