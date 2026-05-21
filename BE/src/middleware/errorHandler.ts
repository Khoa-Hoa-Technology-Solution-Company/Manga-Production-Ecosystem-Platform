import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('❌ Error:', err.message);

  if (err.name === 'ValidationError') {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json({ error: 'Invalid ID format.' });
    return;
  }

  if ((err as any).code === 11000) {
    res.status(409).json({ error: 'Duplicate value. This resource already exists.' });
    return;
  }

  if (err.message?.includes('File type')) {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error.',
  });
}
