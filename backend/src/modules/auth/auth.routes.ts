import type { FastifyInstance } from 'fastify';
import { requestOtpSchema, verifyOtpSchema } from './auth.schemas.js';
import { issueOtp, verifyOtp } from './auth.service.js';
import { config } from '../../config.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/request-otp', async (request) => {
    const { phone } = requestOtpSchema.parse(request.body);
    await issueOtp(phone, (msg) => request.log.info(msg));
    return { message: 'OTP sent (check the server log)', expiresInSeconds: config.otpTtlSeconds };
  });

  app.post('/auth/verify-otp', async (request) => {
    const { phone, otp } = verifyOtpSchema.parse(request.body);
    const user = await verifyOtp(phone, otp);
    const token = app.jwt.sign({ sub: user.id, phone: user.phone }, { expiresIn: '30d' });
    return { token, user: { id: user.id, phone: user.phone } };
  });
}
