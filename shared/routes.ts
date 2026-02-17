import { z } from 'zod';
import { insertClientSchema, insertProductSchema, insertTripSchema, clients, products, trips, orders, insertClientPriceSchema, clientPrices } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  clients: {
    list: { method: 'GET' as const, path: '/api/clients', responses: { 200: z.array(z.custom<typeof clients.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/clients', input: insertClientSchema, responses: { 201: z.custom<typeof clients.$inferSelect>(), 400: errorSchemas.validation } },
    get: { method: 'GET' as const, path: '/api/clients/:id', responses: { 200: z.custom<typeof clients.$inferSelect>(), 404: errorSchemas.notFound } },
    update: { method: 'PUT' as const, path: '/api/clients/:id', input: insertClientSchema.partial(), responses: { 200: z.custom<typeof clients.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: 'DELETE' as const, path: '/api/clients/:id', responses: { 204: z.void(), 404: errorSchemas.notFound } },
    prices: {
      list: { method: 'GET' as const, path: '/api/clients/:id/prices', responses: { 200: z.array(z.custom<typeof clientPrices.$inferSelect>()) } },
      upsert: { method: 'POST' as const, path: '/api/clients/:id/prices', input: insertClientPriceSchema, responses: { 200: z.custom<typeof clientPrices.$inferSelect>() } },
    }
  },
  products: {
    list: { method: 'GET' as const, path: '/api/products', responses: { 200: z.array(z.custom<typeof products.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/products', input: insertProductSchema, responses: { 201: z.custom<typeof products.$inferSelect>(), 400: errorSchemas.validation } },
    get: { method: 'GET' as const, path: '/api/products/:id', responses: { 200: z.custom<typeof products.$inferSelect>(), 404: errorSchemas.notFound } },
    update: { method: 'PUT' as const, path: '/api/products/:id', input: insertProductSchema.partial(), responses: { 200: z.custom<typeof products.$inferSelect>(), 404: errorSchemas.notFound } },
  },
  trips: {
    list: { method: 'GET' as const, path: '/api/trips', responses: { 200: z.array(z.custom<typeof trips.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/trips', input: insertTripSchema, responses: { 201: z.custom<typeof trips.$inferSelect>(), 400: errorSchemas.validation } },
    get: { method: 'GET' as const, path: '/api/trips/:id', responses: { 200: z.custom<typeof trips.$inferSelect>(), 404: errorSchemas.notFound } },
    update: { method: 'PUT' as const, path: '/api/trips/:id', input: insertTripSchema.partial(), responses: { 200: z.custom<typeof trips.$inferSelect>(), 404: errorSchemas.notFound } },
  },
  orders: {
    list: {
      method: 'GET' as const,
      path: '/api/orders',
      input: z.object({ tripId: z.coerce.number().optional() }).optional(),
      responses: { 200: z.array(z.any()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/orders',
      input: z.object({
        tripId: z.number().nullable().optional(),
        clientId: z.number(),
        source: z.string().optional(),
        items: z.array(z.object({ productId: z.number(), quantity: z.number() }))
      }),
      responses: { 201: z.any() }
    },
    get: { method: 'GET' as const, path: '/api/orders/:id', responses: { 200: z.any(), 404: errorSchemas.notFound } },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
