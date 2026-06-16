import { Router } from 'express';
import * as ctrl from '../controllers/meeting.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

router.post('/', authorize('editorial_board', 'editor'), ctrl.createMeeting);
router.get('/', ctrl.getMeetings);
router.delete('/:id', ctrl.deleteMeeting);

export default router;
