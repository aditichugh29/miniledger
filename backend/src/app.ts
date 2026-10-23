import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { HttpError } from './modules/auth/auth.service.js';
import { loanRoutes } from './modules/loans/loans.routes.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  // One place that turns errors into clean JSON responses.
  // (Must be set BEFORE registering route plugins so they inherit it.)
  app.setErrorHandler((error, request, reply) => {
    // Zod validation errors carry an "issues" list (checked by name to be version-proof)
    if ((error as { name?: string }).name === 'ZodError') {
      const issues = (error as unknown as { issues: { path: PropertyKey[]; message: string }[] }).issues;
      return reply.code(400).send({
        error: issues[0]?.message ?? 'Invalid input',
        details: issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    const err = error as { statusCode?: number; message: string };
    if (err.statusCode && err.statusCode < 500) {
      return reply.code(err.statusCode).send({ error: err.message });
    }
    request.log.error(error);
    return reply.code(500).send({ error: 'Something went wrong on the server' });
  });

  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(jwt, { secret: config.jwtSecret });
  await app.register(multipart);

  app.get('/health', async () => ({ status: 'ok' }));
  await app.register(authRoutes);
  await app.register(loanRoutes);

  return app;
}
