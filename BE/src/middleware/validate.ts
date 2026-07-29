import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array();
    res.status(400).json({
      error: details[0]?.msg || 'Invalid request data.',
      errors: details,
    });
    return;
  }
  next();
}
