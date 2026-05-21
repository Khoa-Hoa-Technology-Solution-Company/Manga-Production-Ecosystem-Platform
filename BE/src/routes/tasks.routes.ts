import { Router } from 'express';
import * as ctrl from '../controllers/tasks.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.getAll);
router.post('/', authorize('mangaka'), ctrl.create);
router.patch('/:id/accept', authorize('assistant'), ctrl.acceptTask);
router.patch('/:id/status', ctrl.updateStatus);

export default router;
