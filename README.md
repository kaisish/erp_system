# Dukaan ERP

A learning-focused ERP for small shops, built as a TypeScript monorepo with a separate authentication service, main API, and React frontend.

## Stack

- Node.js 20+, Express, TypeScript
- PostgreSQL + Prisma
- React + Vite
- JWT access/refresh tokens, bcrypt, Zod, Helmet, rate limiting

## Quick start

```bash
cp auth-service/.env.example auth-service/.env
cp main-app/backend/.env.example main-app/backend/.env
cp main-app/frontend/.env.example main-app/frontend/.env

docker compose up -d db-auth db-main
npm install --prefix auth-service
npm install --prefix main-app/backend
npm install --prefix main-app/frontend
npm run prisma:push --prefix auth-service
npm run prisma:push --prefix main-app/backend
npm run dev --prefix auth-service
npm run dev --prefix main-app/backend
npm run dev --prefix main-app/frontend
```

Services:

- Auth API: http://localhost:5000
- Main API: http://localhost:5001
- Frontend: http://localhost:5173

See each service README for details. Never commit `.env` files.
