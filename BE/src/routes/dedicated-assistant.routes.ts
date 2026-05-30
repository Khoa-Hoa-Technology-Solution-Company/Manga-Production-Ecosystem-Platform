import { Router } from 'express';
import * as ctrl from '../controllers/dedicated-assistant.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

// GET  /api/series/:id/dedicated-assistants
router.get('/:id/dedicated-assistants', ctrl.getDedicatedAssistants);

// POST /api/series/:id/dedicated-assistants  (Mangaka only)
router.post('/:id/dedicated-assistants', authorize('mangaka'), ctrl.addDedicatedAssistant);

// DELETE /api/series/:id/dedicated-assistants/:userId  (Mangaka only)
router.delete('/:id/dedicated-assistants/:userId', authorize('mangaka'), ctrl.removeDedicatedAssistant);

export default router;
