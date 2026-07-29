import { Router } from 'express';
import { body } from 'express-validator';
import * as ctrl from '../controllers/rubric-template.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.getTemplates);
router.get('/active', ctrl.getActiveTemplate);
router.post(
  '/',
  [
    body('name').isString().trim().isLength({ min: 2, max: 100 }),
    body('criteria').isArray({ min: 1, max: 20 }),
    body('criteria.*.key').isString().trim().isLength({ min: 1, max: 100 }),
    body('criteria.*.label').isString().trim().isLength({ min: 1, max: 100 }),
    body('criteria.*.weight').optional().isFloat({ min: 0.01, max: 100 }).toFloat(),
  ],
  validate,
  ctrl.createTemplate
);
router.patch('/:id/activate', ctrl.setActiveTemplate);

export default router;
