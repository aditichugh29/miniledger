import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { config } from '../../config.js';
import { HttpError } from '../auth/auth.service.js';
import { detectImageExt } from '../../utils/image.js';
import { createLoanSchema, listQuerySchema, loanIdParams, receiptJsonSchema } from './loans.schemas.js';
import {
  createLoan,
  assertLoanOwned,
  getReceiptFileName,
  getSummary,
  listLoans,
  markRepaid,
  saveReceiptFile,
} from './loans.service.js';

const EXT_TO_MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

export async function loanRoutes(app: FastifyInstance) {
  // Every route in this file needs a valid login token.
  app.addHook('preHandler', requireAuth);

  app.post('/loans', async (request, reply) => {
    const input = createLoanSchema.parse(request.body);
    const loan = await createLoan(request.user.sub, input);
    return reply.code(201).send(loan);
  });

  app.get('/loans', async (request) => {
    const { status } = listQuerySchema.parse(request.query);
    return listLoans(request.user.sub, status);
  });

  // Registered as a fixed path, so it is never confused with /loans/:id
  app.get('/loans/summary', async (request) => getSummary(request.user.sub));

  app.patch('/loans/:id/repay', async (request) => {
    const { id } = loanIdParams.parse(request.params);
    return markRepaid(request.user.sub, id);
  });

  // Bonus: receipt photo upload. Accepts either
  //  - multipart/form-data with a file in the "receipt" field, or
  //  - JSON { "imageBase64": "..." } (what the mobile app uses, it is the most reliable on phones)
  app.post('/loans/:id/receipt', { bodyLimit: 15 * 1024 * 1024 }, async (request) => {
    const { id } = loanIdParams.parse(request.params);
    let buffer: Buffer;

    if (request.isMultipart()) {
      const file = await request.file({ limits: { fileSize: config.maxReceiptBytes } });
      if (!file) throw new HttpError(400, 'Attach an image in the "receipt" field');
      // Read the whole upload first, so the phone never sees a half-finished upload.
      buffer = await file.toBuffer(); // throws 413 if the file is over the size limit
      if (file.file.truncated) throw new HttpError(413, 'Image is too large (max 5 MB)');
    } else {
      const { imageBase64 } = receiptJsonSchema.parse(request.body);
      buffer = Buffer.from(imageBase64, 'base64');
      if (buffer.length > config.maxReceiptBytes) throw new HttpError(413, 'Image is too large (max 5 MB)');
    }

    const ext = detectImageExt(buffer);
    if (!ext) throw new HttpError(400, 'Only JPG, PNG or WEBP images are allowed');
    await assertLoanOwned(request.user.sub, id);

    const fileName = `${randomUUID()}${ext}`;
    await mkdir(config.uploadsDir, { recursive: true });
    await writeFile(path.join(config.uploadsDir, fileName), buffer);
    return saveReceiptFile(request.user.sub, id, fileName);
  });

  app.get('/loans/:id/receipt', async (request, reply) => {
    const { id } = loanIdParams.parse(request.params);
    const fileName = await getReceiptFileName(request.user.sub, id);
    const filePath = path.join(config.uploadsDir, path.basename(fileName));
    await stat(filePath).catch(() => {
      throw new HttpError(404, 'Receipt file is missing');
    });
    const mime = EXT_TO_MIME[path.extname(fileName)] ?? 'application/octet-stream';

    // ?format=base64 returns JSON with a data URI. The app uses this, because it is the
    // most reliable way to show a protected image on a phone.
    const { format } = request.query as { format?: string };
    if (format === 'base64') {
      const data = await readFile(filePath);
      return { dataUri: `data:${mime};base64,${data.toString('base64')}` };
    }

    reply.type(mime);
    return reply.send(createReadStream(filePath));
  });
}
