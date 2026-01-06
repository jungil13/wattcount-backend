import express from 'express';
import * as billController from '../controllers/billController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', billController.createBill);
router.get('/my', billController.getMyBills);
router.get('/all', billController.getAllBills);
router.get('/cycle', billController.getBillsByCycle);
router.get('/:id', billController.getBillById);
router.put('/:id', billController.updateBill);
router.delete('/:id', billController.deleteBill);

export default router;


