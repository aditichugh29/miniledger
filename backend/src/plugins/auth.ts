import type { FastifyReply, FastifyRequest } from 'fastify';

// Used as a preHandler on routes that need a logged-in user.
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Unauthorized. Please log in again' });
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; phone: string };
    user: { sub: string; phone: string };
  }
}
