import { Router } from 'express';
import { body } from 'express-validator';
import * as ctrl from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.post(
  '/register',
  [
    body('email').isString().isLength({ max: 254 }).isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 6, max: 128 }).withMessage('Password must contain 6 to 128 characters.'),
    body('displayName').isString().trim().isLength({ min: 2, max: 80 }).withMessage('Display name must contain 2 to 80 characters.'),
    body('role').optional().isIn(['mangaka', 'assistant', 'reader']).withMessage('Invalid self-service role.'),
  ],
  validate,
  ctrl.register
);

router.post(
  '/login',
  [
    body('email').isString().isLength({ max: 254 }).isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 1, max: 128 }),
  ],
  validate,
  ctrl.login
);

router.get('/me', authenticate, ctrl.getMe);
router.get('/search', authenticate, ctrl.searchUsers);
router.get('/assistants/recommend', authenticate, ctrl.recommendAssistants);
router.put(
  '/profile',
  authenticate,
  [
    body('displayName').optional().isString().trim().isLength({ min: 2, max: 80 }),
    body('bio').optional().isString().trim().isLength({ max: 500 }),
    body('avatar')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 2048 })
      .custom((value: string) => {
        if (!value || (value.startsWith('/') && !value.startsWith('//'))) return true;
        try {
          const parsed = new URL(value);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      })
      .withMessage('Avatar must be an HTTP(S) URL or a relative path.'),
    body('skills').optional().isArray({ max: 50 }),
    body('skills.*').optional().isString().trim().isLength({ min: 1, max: 50 }),
    body('subscribedToNewSeries').optional().isBoolean().toBoolean(),
  ],
  validate,
  ctrl.updateProfile
);

export default router;
