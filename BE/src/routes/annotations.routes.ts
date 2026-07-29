import { Router } from 'express';
import * as ctrl from '../controllers/annotations.controller';
import { authenticate } from '../middleware/auth';
import { requireAnnotationAccess, requireChapterAccess } from '../middleware/chapterAccess';

const router = Router();

router.use(authenticate);

router.get('/chapter/:chapterId', requireChapterAccess('read'), ctrl.getByChapterId);
router.post('/', requireChapterAccess('edit'), ctrl.create);
router.patch('/:id/resolve', requireAnnotationAccess('edit'), ctrl.resolve);
router.delete('/:id', requireAnnotationAccess('edit'), ctrl.remove);

export default router;
