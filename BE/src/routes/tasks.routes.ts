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
router.patch('/:id/accept', authorize('assistant'), requireChapterAccess('edit'), ctrl.acceptTask);
router.patch('/:id/decline', authorize('assistant'), requireChapterAccess('edit'), ctrl.declineTask);
router.patch('/:id/status', requireChapterAccess('edit'), ctrl.updateStatus);
router.post('/:id/submit', authorize('assistant'), upload.single('file'), requireChapterAccess('edit'), ctrl.submitTask);

export default router;
