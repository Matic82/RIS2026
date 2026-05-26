import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initDb, closeDb } from './db.js';
import authRoutes from './routes/auth.js';
import { logEmailConfigStatus } from './services/emailService.js';
import memberRoutes from './routes/member.js';
import adminRoutes from './routes/admin.js';

const app = express();

app.use(
  cors({
    origin: [config.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'maestro-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/users', memberRoutes);
app.use('/api/admin', adminRoutes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
);

async function main() {
  await initDb();
  logEmailConfigStatus();
  app.listen(config.port, () => {
    console.log(`Maestro API listening on http://localhost:${config.port}`);
  });
}

main().catch((e) => {
  console.error('Failed to start server:', e);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await closeDb();
  process.exit(0);
});
