# Main backend

Business API for products, customers, dashboard metrics, sales and inventory. Every `/api` endpoint delegates authentication to `auth-service` via `/verify`.

Run `npm install`, copy `.env.example` to `.env`, run `npm run prisma:push`, then `npm run dev`.
