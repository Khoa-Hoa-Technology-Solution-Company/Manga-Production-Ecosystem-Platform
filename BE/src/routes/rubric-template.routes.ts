import { Router } from 'express';
import * as ctrl from '../controllers/rubric-template.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.getTemplates);
router.get('/active', ctrl.getActiveTemplate);
router.post('/', ctrl.createTemplate);
router.patch('/:id/activate', ctrl.setActiveTemplate);

export default router;
