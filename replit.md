# replit.md

## Overview

This is a **Brazilian Portuguese (pt-BR) industrial order management system** ("Indústria - Gestão de Pedidos") for managing clients, products, delivery trips, and orders. It's a full-stack web application where sales representatives can organize delivery routes (trips), register clients with custom pricing, manage a product catalog, and create orders tied to specific trips and clients.

The core domain entities are:
- **Clients** — Business customers with CNPJ, address, contact info
- **Products** — Items with name, color, size, and active status
- **Trips** — Delivery routes with start/end dates and open/closed status
- **Orders** — Linked to a trip and client, containing multiple order items with quantities and unit prices. Orders have a `source` field (admin/client), nullable `tripId` for client-submitted orders awaiting approval, `paid` boolean for payment tracking, and `observation` for free-text payment negotiation notes (set via the cash flow system, not during order creation).
- **Client Prices** — Custom per-client pricing for products (per size category)
- **Messages** — Client-to-admin and admin-to-client messaging with read status
- **Showcase Products** — Products displayed on the public vitrine (virtual showcase) site, categorized by size (GRANDE, MÉDIA, PEQUENA, OVAL, PLANO), with rich text descriptions
- **Site Settings** — Key-value store for site configuration (logo, footerLogo, phone, whatsapp, address, aboutText, email, instagram, seoTitle, seoDescription, seoKeywords, ogImage, primaryColor, siteUrl, mission, vision, values)
- **Hero Slides** — Carousel slides for the vitrine home page with title, subtitle, button text/link, image
- **Contact Submissions** — Messages received via the vitrine contact form, with name, email, phone, subject, message, read status

The system has three portals:
- **Admin Portal** — Full management at `/painel/*` (clients, products, trips, orders, pricing, approval of client orders, messaging, vitrine/showcase management, contact submissions). Routes: `/painel` (dashboard), `/painel/clientes`, `/painel/produtos`, `/painel/viagens`, `/painel/pedidos`, `/painel/pedidos/novo`, `/painel/pedidos/editar/:id`, `/painel/solicitacoes`, `/painel/mensagens`, `/painel/relatorios`, `/painel/financeiro`, `/painel/vitrine`, `/painel/usuarios`.
- **Client Portal** — CNPJ-only login, order placement, messaging. Accessible at `/portal/login`.
- **Vitrine Virtual** — Public showcase website at root paths (`/`, `/produtos`, `/sobre`, `/contato`, `/produto/:id`) with product catalog, about page, contact form, hero slider, and WhatsApp integration. Admin manages content at `/painel/vitrine`. Features top bar with contact info/social links, floral ornamental design, dynamic SEO meta tags, canonical URLs, JSON-LD structured data, mission/vision/values sections, dual logo support (header + footer), and customizable primary color via CSS variable `--vitrine-primary`.
  - **SEO**: Dynamic `/sitemap.xml` (static pages + showcase products) and `/robots.txt` (allows root public paths, disallows `/painel/` and `/api/`). Canonical URLs and Schema.org Organization JSON-LD injected via `useSeoMeta` hook. Alt-text audit in SEO report tab.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming, custom fonts (DM Sans, Outfit)
- **Forms**: React Hook Form with Zod resolvers for validation
- **Charts**: Recharts for dashboard analytics
- **Build Tool**: Vite with React plugin
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Framework**: Express.js running on Node with TypeScript (tsx for development)
- **Architecture**: Monolithic server serving both API and static frontend
- **API Pattern**: RESTful routes defined in `shared/routes.ts` with Zod schemas for input validation and response types. Route definitions are shared between client and server.
- **Authentication**: Standalone username/password authentication with bcrypt password hashing. Sessions stored in PostgreSQL via `connect-pg-simple`. Auth logic in `server/auth.ts`. Default admin credentials: `admin`/`admin123` (auto-created on first run if no users with passwords exist).
- **Session Management**: Express sessions with 1-week TTL, stored in the `sessions` database table

### Shared Code (`shared/`)
- **Schema** (`shared/schema.ts`): Drizzle ORM table definitions for all entities (clients, products, trips, orders, order_items, client_prices) plus auth tables (users, sessions)
- **Routes** (`shared/routes.ts`): API contract definitions with Zod schemas, used by both server (validation) and client (type-safe API calls)
- **Models** (`shared/models/auth.ts`): Auth-specific table definitions (users, sessions) — mandatory for Replit Auth

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (connection via `DATABASE_URL` environment variable)
- **Schema Push**: `npm run db:push` uses drizzle-kit to push schema changes
- **Migrations**: Output to `./migrations` directory
- **Storage Pattern**: `server/storage.ts` implements an `IStorage` interface with a `DatabaseStorage` class, providing a clean abstraction over database operations

### Build Process
- **Development**: `npm run dev` — runs tsx with Vite dev server (HMR enabled)
- **Production Build**: `npm run build` — Vite builds the client to `dist/public`, esbuild bundles the server to `dist/index.cjs`
- **Production Start**: `npm start` — runs the built Node server

### Key Design Decisions

1. **Shared route contracts**: API routes are defined once in `shared/routes.ts` with Zod schemas, ensuring type safety across client and server. The client hooks use these definitions for request/response validation.

2. **UI Language**: All user-facing text is in Brazilian Portuguese (pt-BR). Navigation labels, form fields, toasts, and page titles use Portuguese.

3. **Protected routes**: All API endpoints (except auth) require authentication via the `isAuthenticated` middleware. The frontend wraps pages in a `ProtectedRoute` component that redirects to `/login` if unauthenticated.

4. **Client-specific pricing**: The `client_prices` table allows per-client product pricing, supporting different price tiers per customer.

5. **Cash Flow System**: Complete financial management via the "Financeiro" page (`/cash-flow`) with three tabs:
   - **Resumo**: Overall summary (total receivable, total payable, pending, balance), pending items lists, and per-trip order payment tracking with observation modals
   - **Contas a Receber**: Manual receivable entries CRUD with categories (Venda de Produtos, Serviços, Outros), status filtering, and summary cards
   - **Contas a Pagar**: Manual payable entries CRUD with categories (Fornecedores, Combustível, Manutenção, Salários, Aluguel, Impostos, Frete, etc.), status filtering, and summary cards
   - Financial entries stored in `financial_entries` table with type, description, amount, dueDate, paidDate, status, category, observation, optional clientId/tripId
   - API: `GET/POST/PUT/DELETE /api/finance/entries`, `PUT /api/orders/:id/payment`

## External Dependencies

### Database
- **PostgreSQL** — Primary data store, required. Connection string via `DATABASE_URL` environment variable.

### Authentication
- **Replit Auth (OIDC)** — Uses Replit's OpenID Connect provider for authentication. Requires `REPL_ID`, `ISSUER_URL`, and `SESSION_SECRET` environment variables. Login flow redirects to `/api/login`.

### Key npm Packages
- `drizzle-orm` + `drizzle-kit` — ORM and schema migration tooling
- `express` + `express-session` — HTTP server and session management
- `connect-pg-simple` — PostgreSQL session store
- `passport` + `openid-client` — OIDC authentication strategy
- `zod` + `drizzle-zod` — Schema validation and Drizzle-to-Zod schema generation
- `@tanstack/react-query` — Client-side data fetching and caching
- `recharts` — Dashboard charts
- `date-fns` — Date formatting (with pt-BR locale)
- `react-hook-form` + `@hookform/resolvers` — Form state management
- `wouter` — Client-side routing
- Full shadcn/ui component library (Radix UI primitives)

### Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Secret for signing session cookies
- `REPL_ID` — Replit deployment identifier (set automatically on Replit)
- `ISSUER_URL` — OIDC issuer URL (defaults to `https://replit.com/oidc`)