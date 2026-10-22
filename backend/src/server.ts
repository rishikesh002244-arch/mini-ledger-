import { createServer } from 'node:http';
import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { uploadsRoot } from './middlewares/upload.middleware';

const server = createServer(app);
let isShuttingDown = false;

const startBanner = (): void => {
  console.log(
    [
      '',
      '  MiniLedger API',
      `  ├─ environment : ${env.NODE_ENV}`,
      `  ├─ listening   : http://localhost:${env.PORT}`,
      `  ├─ health      : http://localhost:${env.PORT}/health`,
      `  ├─ api base    : http://localhost:${env.PORT}/api`,
      `  └─ receipts    : ${uploadsRoot}`,
      '',
    ].join('\n'),
  );
};

const shutdown = async (signal: string, exitCode = 0): Promise<void> => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[${signal}] Closing HTTP server and database connections…`);

  // Do not hang forever if a keep-alive connection refuses to close.
  const forceExit = setTimeout(() => process.exit(exitCode || 1), 10_000);
  forceExit.unref();

  server.close(() => {
    void prisma
      .$disconnect()
      .catch((error: unknown) => console.error('Failed to disconnect Prisma:', error))
      .finally(() => process.exit(exitCode));
  });
};

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `\n❌ Port ${env.PORT} is already in use. Stop the other process or set PORT in .env.\n`,
    );
  } else {
    console.error('\n❌ Failed to start the HTTP server:', error);
  }
  process.exit(1);
});

server.listen(env.PORT, startBanner);

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  void shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  void shutdown('uncaughtException', 1);
});
