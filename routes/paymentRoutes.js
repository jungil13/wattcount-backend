import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', paymentController.createPayment);
router.get('/my', paymentController.getMyPayments);
router.get('/bill/:bill_id', paymentController.getPaymentsByBill);
router.get('/:id', paymentController.getPaymentById);

export default router;


