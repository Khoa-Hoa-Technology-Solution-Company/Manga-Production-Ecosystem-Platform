import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { initSocket } from './socket';
import { startScheduler } from './services/scheduler.service';

async function start() {
  // Connect to MongoDB
  await connectDB();

  // Start scheduled chapter publisher background worker
  startScheduler();

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize Socket.io
  initSocket(server);

  // Start server
  server.listen(env.PORT, env.HOST, () => {
    console.log(`
🚀 MangaFlow Backend running!
   ├─ HTTP:    http://${env.HOST}:${env.PORT}
   ├─ API:     http://localhost:${env.PORT}/api
   ├─ Swagger: http://localhost:${env.PORT}/api-docs
   ├─ Socket:  ws://localhost:${env.PORT}
   └─ Env:     ${env.NODE_ENV}
    `);
  });
}


start().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
