# Auth service

Independent authentication API backed by its own PostgreSQL database.

Endpoints: `POST /register`, `POST /login`, `POST /refresh`, `GET /verify`, `GET /health`.

Run `npm install`, copy `.env.example` to `.env`, run `npm run prisma:push`, then `npm run dev`.
