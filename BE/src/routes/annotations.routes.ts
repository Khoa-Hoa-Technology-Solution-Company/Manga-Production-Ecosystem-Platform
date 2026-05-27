import { Router } from 'express';
import * as ctrl from '../controllers/annotations.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/chapter/:chapterId', ctrl.getByChapterId);
router.post('/', ctrl.create);
router.patch('/:id/resolve', ctrl.resolve);

export default router;
