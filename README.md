# Dukaan ERP

The first usable ERP workflow is now implemented: manage products and customers, create cash or credit sales, automatically decrement stock, track customer udhaar, and view dashboard metrics.

## Run

```bash
docker compose up -d db-auth db-main
npm install --prefix auth-service
npm install --prefix main-app/backend
npm install --prefix main-app/frontend
npm run prisma:push --prefix auth-service
npm run prisma:push --prefix main-app/backend
# in three terminals
npm run dev --prefix auth-service
npm run dev --prefix main-app/backend
npm run dev --prefix main-app/frontend
```

Register first:

```bash
curl -X POST http://localhost:5000/register -H 'content-type: application/json' -d '{"name":"Owner","email":"owner@example.com","password":"password123"}'
```

Then open `http://localhost:5173` and log in.
