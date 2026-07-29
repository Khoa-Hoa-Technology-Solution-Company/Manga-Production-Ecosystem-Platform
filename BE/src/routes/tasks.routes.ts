import { Router } from 'express';
import * as ctrl from '../controllers/tasks.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { upload } from '../middleware/upload';
import { requireTaskAccess } from '../middleware/chapterAccess';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', requireTaskAccess('view'), ctrl.getById);
router.post('/', authorize('mangaka'), requireTaskAccess('manage'), ctrl.create);
router.put('/:id', requireTaskAccess('manage'), ctrl.update);
router.delete('/:id', requireTaskAccess('manage'), ctrl.cancelTask);
router.patch('/:id/accept', authorize('assistant'), requireTaskAccess('accept'), ctrl.acceptTask);
router.patch('/:id/decline', authorize('assistant'), requireTaskAccess('decline'), ctrl.declineTask);
router.patch('/:id/status', requireTaskAccess('status'), ctrl.updateStatus);
router.post('/:id/submit', authorize('assistant'), requireTaskAccess('submit'), upload.single('file'), ctrl.submitTask);

export default router;
