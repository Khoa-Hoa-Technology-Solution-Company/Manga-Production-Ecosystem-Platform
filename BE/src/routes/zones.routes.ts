import { Router } from 'express';
import * as ctrl from '../controllers/zones.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/page/:pageId', ctrl.getByPageId);
router.post('/page/:pageId', authorize('mangaka'), ctrl.create);
router.put('/:id', authorize('mangaka'), ctrl.update);
router.delete('/:id', authorize('mangaka'), ctrl.remove);

export default router;
