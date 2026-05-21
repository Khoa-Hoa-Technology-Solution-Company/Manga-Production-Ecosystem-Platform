import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth.routes';
import seriesRoutes from './routes/series.routes';
import chaptersRoutes from './routes/chapters.routes';
import dashboardRoutes from './routes/dashboard.routes';
import tasksRoutes from './routes/tasks.routes';
import pagesRoutes from './routes/pages.routes';
import zonesRoutes from './routes/zones.routes';
import interactionsRoutes from './routes/interactions.routes';
import commentsRoutes from './routes/comments.routes';
import notificationsRoutes from './routes/notifications.routes';

const app = express();

// ── Security ────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },  // Allow FE (port 5173) to load images from BE (port 3000)
}));
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

// ── Rate limiting ───────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ── Body parsing ────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static files (uploads + manga assets) ───────────
app.use('/uploads', express.static(path.join(process.cwd(), env.UPLOAD_DIR)));
app.use('/manga', express.static(path.join(process.cwd(), '..', 'FE', 'public', 'manga')));

// ── Swagger API Docs ────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MangaFlow API Docs',
}));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// ── API Routes ──────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/chapters', chaptersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/pages', pagesRoutes);
app.use('/api/zones', zonesRoutes);
app.use('/api/chapters', interactionsRoutes);  // votes & comments nested under chapters
app.use('/api/comments', commentsRoutes);
app.use('/api/notifications', notificationsRoutes);

// ── Health check ────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handler ───────────────────────────────────
app.use(errorHandler);

export default app;
