import { Router } from 'express';
import * as ctrl from '../controllers/comments.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/:id/like', ctrl.like);

export default router;
