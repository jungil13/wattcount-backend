import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/connect', authController.connectWithSharedCode);
router.post('/generate-code', authenticateToken, authController.generateSharedCode);
router.get('/shared-codes', authenticateToken, authController.getMySharedCodes);
router.delete('/shared-codes/:code', authenticateToken, authController.deleteSharedCode);
router.get('/profile', authenticateToken, authController.getProfile);

export default router;

