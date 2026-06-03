import { Router } from 'express';
import * as ctrl from '../controllers/eb.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(authorize('editorial_board'));

router.get('/pending', ctrl.getPendingReview);
router.get('/dashboard', ctrl.getDashboard);
router.post('/vote/:seriesId', ctrl.castVote);
router.patch('/decision/:seriesId', ctrl.makeFinalDecision);
router.post('/reader-votes/:seriesId', ctrl.inputReaderVotes);
router.patch('/cancel/:seriesId', ctrl.cancelSeries);

export default router;
