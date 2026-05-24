import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import swaggerUi from 'swagger-ui-express'
import { env } from './config/env'
import { swaggerSpec } from './config/swagger'
import { errorHandler } from './middleware/errorHandler'

// Routes
import authRoutes from './routes/auth.routes'
import seriesRoutes from './routes/series.routes'
import chaptersRoutes from './routes/chapters.routes'
import dashboardRoutes from './routes/dashboard.routes'
import tasksRoutes from './routes/tasks.routes'
import pagesRoutes from './routes/pages.routes'
import zonesRoutes from './routes/zones.routes'
import interactionsRoutes from './routes/interactions.routes'
import commentsRoutes from './routes/comments.routes'
import notificationsRoutes from './routes/notifications.routes'

const app = express()
const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:8081']

function getAllowedOrigins() {
  const origins = new Set(DEFAULT_ALLOWED_ORIGINS)
  env.CORS_ORIGIN.split(',').forEach((origin) => {
    const trimmed = origin.trim()
    if (trimmed) origins.add(trimmed)
  })
  return origins
}

function isOriginAllowed(origin: string) {
  const allowedOrigins = getAllowedOrigins()
  return (
    allowedOrigins.has(origin) ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.startsWith('http://192.168.')
  )
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      callback(null, isOriginAllowed(origin))
    },
    credentials: true,
  })
)

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url}`)
  res.on('finish', () => {
    console.log(`  └─ Response: ${res.statusCode}`)
  })
  next()
})

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
})
app.use('/api/', limiter)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/uploads', express.static(path.join(process.cwd(), env.UPLOAD_DIR)))
app.use('/manga', express.static(path.join(process.cwd(), '..', 'FE', 'public', 'manga')))

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'MangaFlow API Docs',
  })
)
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec))

app.use('/api/auth', authRoutes)
app.use('/api/series', seriesRoutes)
app.use('/api/chapters', chaptersRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/tasks', tasksRoutes)
app.use('/api/pages', pagesRoutes)
app.use('/api/zones', zonesRoutes)
app.use('/api/chapters', interactionsRoutes)
app.use('/api/comments', commentsRoutes)
app.use('/api/notifications', notificationsRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use(errorHandler)

export default app
