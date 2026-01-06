import express from 'express';
import * as rateController from '../controllers/rateController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', rateController.setRate);
router.get('/current', rateController.getCurrentRate);
router.get('/all', rateController.getAllRates);

export default router;


