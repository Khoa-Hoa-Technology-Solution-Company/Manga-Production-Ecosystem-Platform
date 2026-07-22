import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from '../controllers/reader.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/home', ctrl.getHome);
router.get('/progress', ctrl.getProgress);
router.put('/progress', ctrl.updateProgress);
router.post(
  '/assistant/chat',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Too many assistant messages. Please try again later.' },
  }),
  ctrl.chat
);

export default router;
