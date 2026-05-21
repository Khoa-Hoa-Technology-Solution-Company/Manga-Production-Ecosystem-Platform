import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', ctrl.getStats);
router.get('/workflow', ctrl.getWorkflow);
router.get('/rankings', ctrl.getRankings);

export default router;
