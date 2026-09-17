import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const app = express();
const db = new PrismaClient();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use(express.json());

async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) return res.status(401).json({ error: 'Missing authorization' });
    const response = await fetch(`${process.env.AUTH_SERVICE_URL}/verify`, { headers: { authorization } });
    if (!response.ok) return res.status(401).json({ error: 'Unauthorized' });
    (req as any).user = (await response.json()).user;
    next();
  } catch {
    res.status(503).json({ error: 'Auth service unavailable' });
  }
}

const productInput = z.object({ name: z.string().trim().min(1).max(120), sku: z.string().trim().min(1).max(40), price: z.coerce.number().finite().nonnegative(), stock: z.coerce.number().int().nonnegative() });
const customerInput = z.object({ name: z.string().trim().min(1).max(120), phone: z.string().trim().max(30).optional() });
const saleInput = z.object({ customerId: z.string().cuid().optional().nullable(), paid: z.coerce.number().finite().nonnegative(), items: z.array(z.object({ productId: z.string().cuid(), quantity: z.coerce.number().int().positive() })).min(1) });
const paymentInput = z.object({ amount: z.coerce.number().finite().positive() });

app.get('/health', (_, res) => res.json({ ok: true, service: 'main-backend' }));
app.use('/api', auth);

app.get('/api/products', async (_, res, next) => { try { res.json(await db.product.findMany({ orderBy: { createdAt: 'desc' } })); } catch (e) { next(e); } });
app.post('/api/products', async (req, res, next) => { try { res.status(201).json(await db.product.create({ data: productInput.parse(req.body) })); } catch (e) { next(e); } });
app.patch('/api/products/:id', async (req, res, next) => { try { res.json(await db.product.update({ where: { id: req.params.id }, data: productInput.partial().parse(req.body) })); } catch (e) { next(e); } });

app.get('/api/customers', async (_, res, next) => { try { res.json(await db.customer.findMany({ orderBy: { createdAt: 'desc' } })); } catch (e) { next(e); } });
app.post('/api/customers', async (req, res, next) => { try { res.status(201).json(await db.customer.create({ data: customerInput.parse(req.body) })); } catch (e) { next(e); } });
app.post('/api/customers/:id/payments', async (req, res, next) => { try { const input = paymentInput.parse(req.body); const customer = await db.customer.findUnique({ where: { id: req.params.id } }); if (!customer) return res.status(404).json({ error: 'Customer not found' }); if (input.amount > Number(customer.balance)) return res.status(400).json({ error: 'Payment exceeds outstanding balance' }); res.json(await db.customer.update({ where: { id: req.params.id }, data: { balance: { decrement: input.amount } } })); } catch (e) { next(e); } });

app.post('/api/sales', async (req, res, next) => {
  try {
    const input = saleInput.parse(req.body);
    const result = await db.$transaction(async (tx) => {
      const products = await Promise.all(input.items.map((item) => tx.product.findUnique({ where: { id: item.productId } })));
      if (products.some((product) => !product)) throw Object.assign(new Error('Product not found'), { status: 404 });
      const lines = input.items.map((item, index) => ({ ...item, product: products[index]! }));
      if (lines.some((line) => line.quantity > line.product.stock)) throw Object.assign(new Error('Insufficient stock'), { status: 400 });
      const total = lines.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);
      if (input.paid > total) throw Object.assign(new Error('Payment cannot exceed total'), { status: 400 });
      if (input.paid < total && !input.customerId) throw Object.assign(new Error('A customer is required for credit sales'), { status: 400 });
      const sale = await tx.sale.create({ data: { customerId: input.customerId || undefined, total, paid: input.paid, items: { create: lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: line.product.price })) } }, include: { items: { include: { product: true } }, customer: true } });
      await Promise.all(lines.map((line) => tx.product.update({ where: { id: line.productId }, data: { stock: { decrement: line.quantity } } })));
      if (input.customerId && input.paid < total) await tx.customer.update({ where: { id: input.customerId }, data: { balance: { increment: total - input.paid } } });
      return sale;
    });
    res.status(201).json(result);
  } catch (e: any) { next(e); }
});
app.get('/api/sales', async (_, res, next) => { try { res.json(await db.sale.findMany({ include: { customer: true, items: { include: { product: true } } }, orderBy: { createdAt: 'desc' }, take: 100 })); } catch (e) { next(e); } });
app.get('/api/dashboard', async (_, res, next) => { try { const [products, customers, sales, stock] = await Promise.all([db.product.count(), db.customer.count(), db.sale.aggregate({ _sum: { total: true } }), db.product.aggregate({ _sum: { stock: true } })]); res.json({ products, customers, sales: await db.sale.count(), revenue: sales._sum.total || 0, stock: stock._sum.stock || 0 }); } catch (e) { next(e); } });

app.use((error: any, _req: Request, res: Response, _next: NextFunction) => { if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.flatten() }); const status = error.status || (error.code === 'P2002' ? 409 : 500); if (status === 500) console.error(error); res.status(status).json({ error: status === 500 ? 'Internal server error' : error.message }); });
const port = Number(process.env.PORT || 5001);
app.listen(port, () => console.log(`Main backend listening on ${port}`));
