import express from 'express';
import * as consumptionController from '../controllers/consumptionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', consumptionController.createConsumption);
router.get('/my', consumptionController.getMyConsumption);
router.get('/all', consumptionController.getAllConsumption);
router.get('/summary', consumptionController.getConsumptionSummary);
router.get('/:id', consumptionController.getConsumptionById);
router.put('/:id', consumptionController.updateConsumption);
router.delete('/:id', consumptionController.deleteConsumption);

export default router;


