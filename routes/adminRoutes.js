import express from 'express';
import { registerUser, loginUser, getProfile, registerAdmin } from '../controllers/loginController.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/admin/register', registerAdmin);
router.post('/admin/login', loginUser);

// Protected routes
router.get('/admin/profile', authenticate, getProfile);
router.get('/admin/dashboard', authenticate, authorizeAdmin, (req, res) => {
    res.json({ message: 'Admin dashboard access granted' });
});

export default router; 