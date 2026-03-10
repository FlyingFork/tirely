# Tirely

A full-stack TypeScript monorepo powered by [Turborepo](https://turbo.build/repo).

## Tech Stack

| Layer          | Technology                                   |
| -------------- | -------------------------------------------- |
| **Frontend**   | Next.js 16 (App Router, React 19, Turbopack) |
| **Backend**    | Fastify 5                                    |
| **Database**   | PostgreSQL with Prisma 7                     |
| **Auth**       | better-auth (email/password, admin roles)    |
| **Validation** | Zod                                          |
| **Testing**    | Vitest 4 (V8 coverage)                       |
| **UI**         | Radix UI                                     |

## Project Structure

```
apps/
  api/          → Fastify REST API (port 4000)
  web/          → Next.js web app (port 3000)
packages/
  database/     → Prisma client, schema & migrations
  validators/   → Shared Zod schemas
  types/        → Shared TypeScript interfaces
  testing/      → Vitest base config & test helpers
  eslint/       → Shared ESLint config
  prettier/     → Shared Prettier config
  typescript/   → Shared tsconfig presets
```

## Prerequisites

- **Node.js** >= 24
- **npm** >= 11
- **PostgreSQL** latest

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file (or copy from `.env.example`) with the following:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/database

# API
API_PORT=4000
API_HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000

# Auth
BETTER_AUTH_SECRET=generate-a-long-random-secret-here
BETTER_AUTH_URL=http://localhost:4000

# Web
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Then copy the `.env` file into `apps/web`, `apps/api`, and `packages/database`.

### 3. Set up the database

```bash
cd packages/database
npx prisma migrate dev
```

### 4. Start development

To start development, you will have to run this command in the root of the project:

```bash
npm run dev
```

This starts both the API (`http://localhost:4000`) and web app (`http://localhost:3000`).

## Scripts

| Command               | Description                   |
| --------------------- | ----------------------------- |
| `npm run dev`         | Start all apps in dev mode    |
| `npm run build`       | Build all apps and packages   |
| `npm run test`        | Run tests across the monorepo |
| `npm run lint`        | Lint all packages             |
| `npm run check-types` | Type-check all packages       |
| `npm run format`      | Format code with Prettier     |
