import { users, type User, type UpsertUser, ALL_MODULES } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserPermissions(id: string, role: string, permissions: string[]): Promise<User | undefined>;
  createManualUser(data: { email: string; firstName: string; lastName: string; role: string; permissions: string[] }): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUserPermissions(id: string, role: string, permissions: string[]): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, permissions, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async createManualUser(data: { email: string; firstName: string; lastName: string; role: string; permissions: string[] }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        permissions: data.permissions,
      })
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingById = userData.id ? await this.getUser(userData.id) : undefined;
    if (existingById) {
      const updateData: any = {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        updatedAt: new Date(),
      };
      const [user] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userData.id!))
        .returning();
      return user;
    }

    const allUsers = await this.getAllUsers();
    const hasGlobalAdmin = allUsers.some(u => u.role === "global_admin");

    const newUserData: any = {
      ...userData,
      role: hasGlobalAdmin ? "admin" : "global_admin",
      permissions: hasGlobalAdmin ? [] : [...ALL_MODULES],
    };

    const [user] = await db
      .insert(users)
      .values(newUserData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
