import { Router } from 'express';
import { body } from 'express-validator';
import * as ctrl from '../controllers/meeting.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize('editorial_board'),
  [
    body('title').isString().trim().isLength({ min: 2, max: 120 }),
    body('description').optional().isString().trim().isLength({ max: 2000 }),
    body('dateTime')
      .isISO8601()
      .custom((value: string) => new Date(value).getTime() > Date.now())
      .withMessage('Meeting date/time must be in the future.'),
    body('location').optional().isString().trim().isLength({ max: 200 }),
    body('purpose').optional().isIn(['proposal_review', 'cancellation_review']),
    body('participants').isArray({ min: 1, max: 51 }),
    body('participants.*').isMongoId(),
    body('seriesId').optional().isMongoId(),
    body('seriesIds').optional().isArray({ min: 1, max: 50 }),
    body('seriesIds.*').optional().isMongoId(),
    body('rubricTemplateId').optional({ values: 'falsy' }).isMongoId(),
  ],
  validate,
  ctrl.createMeeting
);
router.get('/', ctrl.getMeetings);
router.delete('/:id', ctrl.deleteMeeting);

export default router;
