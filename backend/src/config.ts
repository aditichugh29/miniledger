// Central place for environment configuration.
export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  timezone: process.env.APP_TIMEZONE ?? 'Asia/Kolkata',
  otpTtlSeconds: 5 * 60,
  otpMaxAttempts: 5,
  otpResendSeconds: 30,
  maxReceiptBytes: 5 * 1024 * 1024,
  uploadsDir: process.env.UPLOADS_DIR ?? 'uploads',
};
