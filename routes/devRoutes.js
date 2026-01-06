import express from 'express';
import * as devController from '../controllers/devController.js';

const router = express.Router();

// Development routes - no auth required
router.post('/auto-login', devController.autoLogin);
router.get('/test-users', devController.getTestUsers);

export default router;


