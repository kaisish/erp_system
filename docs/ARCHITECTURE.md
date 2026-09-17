# Architecture notes

## Services

- `auth-service`: owns users, passwords, refresh tokens and JWT issuance. It has its own database.
- `main-app/backend`: owns ERP data and calls the auth service over HTTP for token verification.
- `main-app/frontend`: browser client; it never connects directly to either database.

## Security baseline

Secrets are environment variables, passwords use bcrypt, access tokens are short-lived, refresh tokens are hashed at rest, login is rate-limited, input is validated with Zod, and security headers are enabled with Helmet.

## API smoke test

```bash
curl -X POST http://localhost:5000/register -H 'content-type: application/json' -d '{"name":"Owner","email":"owner@example.com","password":"password123"}'
curl http://localhost:5000/health
curl http://localhost:5001/health
```
