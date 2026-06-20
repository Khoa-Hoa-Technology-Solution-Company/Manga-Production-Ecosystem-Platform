import { Router } from 'express';
import * as ctrl from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.post('/', upload.single('file'), ctrl.uploadFile);

export default router;
