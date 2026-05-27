import { Router } from 'express';
import * as ctrl from '../controllers/editor.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(authorize('editor'));

router.get('/portfolio', ctrl.getPortfolio);
router.get('/milestones/:seriesId', ctrl.getMilestones);
router.get('/warnings', ctrl.getWarnings);
router.get('/analytics/:mangakaId', ctrl.getAnalytics);

export default router;
