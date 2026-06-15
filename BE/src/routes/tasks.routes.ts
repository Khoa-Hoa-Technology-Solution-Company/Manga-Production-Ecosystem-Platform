import { Router } from 'express';
import * as ctrl from '../controllers/tasks.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { upload } from '../middleware/upload';
import { requireChapterAccess } from '../middleware/chapterAccess';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', requireChapterAccess('edit'), ctrl.create);
router.put('/:id', requireChapterAccess('edit'), ctrl.update);
router.delete('/:id', requireChapterAccess('edit'), ctrl.cancelTask);
router.patch('/:id/accept', authorize('assistant'), ctrl.acceptTask);
router.patch('/:id/decline', authorize('assistant'), ctrl.declineTask);
router.patch('/:id/status', ctrl.updateStatus);
router.post('/:id/submit', authorize('assistant'), upload.single('file'), ctrl.submitTask);

export default router;
