import { Router } from 'express';
import * as ctrl from '../controllers/tasks.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authorize('mangaka'), ctrl.create);
router.put('/:id', authorize('mangaka', 'assistant'), ctrl.update);
router.patch('/:id/accept', authorize('assistant'), ctrl.acceptTask);
router.patch('/:id/decline', authorize('assistant'), ctrl.declineTask);
router.patch('/:id/status', ctrl.updateStatus);
router.post('/:id/submit', authorize('assistant'), upload.single('file'), ctrl.submitTask);

export default router;
