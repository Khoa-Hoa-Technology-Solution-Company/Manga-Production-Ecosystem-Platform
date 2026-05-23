import { Router } from 'express';
import { body } from 'express-validator';
import * as ctrl from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('displayName').trim().notEmpty().withMessage('Display name is required.'),
    body('role').optional().isIn(['mangaka', 'assistant', 'editor', 'editorial_board', 'reader']),
  ],
  validate,
  ctrl.register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  ctrl.login
);

router.get('/me', authenticate, ctrl.getMe);
router.get('/search', authenticate, ctrl.searchUsers);
router.put('/profile', authenticate, ctrl.updateProfile);

export default router;
