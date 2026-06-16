import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { User } from '../models/User';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        email: string;
        displayName: string;
        role: string;
        isEbHead: boolean;
      };
      chapterAccess?: {
        chapterId: string;
        role: string;
        canEdit: boolean;
        canComment: boolean;
        canInvite: boolean;
      };
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Access denied. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded: JwtPayload = verifyToken(token);

    const user = await User.findById(decoded.userId).select('email displayName role isActive isEbHead');
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid token or user deactivated.' });
      return;
    }

    req.user = {
      _id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isEbHead: !!user.isEbHead,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
