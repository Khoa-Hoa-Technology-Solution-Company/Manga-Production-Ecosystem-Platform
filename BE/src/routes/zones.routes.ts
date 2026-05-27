import { Router } from 'express';
import * as ctrl from '../controllers/zones.controller';
import { authenticate } from '../middleware/auth';
import { requirePageAccess, requireZoneAccess } from '../middleware/chapterAccess';

const router = Router();

router.use(authenticate);

router.get('/page/:pageId', requirePageAccess('read'), ctrl.getByPageId);
router.post('/page/:pageId', requirePageAccess('edit'), ctrl.create);
router.put('/:id', requireZoneAccess('edit'), ctrl.update);
router.delete('/:id', requireZoneAccess('edit'), ctrl.remove);

export default router;
