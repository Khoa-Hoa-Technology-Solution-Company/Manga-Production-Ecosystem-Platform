import { Router } from 'express';
import * as ctrl from '../controllers/reactions.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/:targetType/:targetId', ctrl.toggleReaction);
router.get('/:targetType/:targetId', ctrl.getReactions);

export default router;
