import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';

/**
 * Middleware factory that restricts access to specific roles.
 * Must be used AFTER authenticate middleware.
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        error: 'Forbidden. You do not have permission to access this resource.',
        requiredRoles: roles,
        yourRole: req.user.role,
      });
      return;
    }

    next();
  };
}
