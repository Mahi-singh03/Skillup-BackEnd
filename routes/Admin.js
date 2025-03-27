import express from 'express';
import { 
  registerAdmin, 
  loginAdmin, 
  getAdminProfile,
  getAllAdmins,
  updateAdmin,
  deleteAdmin
} from '../controllers/admin.js';
import { getDashboardStats } from '../controllers/adminDashboard.js';
import { protect } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/profile', protect, getAdminProfile);
router.get('/all', protect, getAllAdmins);
router.put('/:id', protect, updateAdmin);
router.delete('/:id', protect, deleteAdmin);
router.get('/dashboard', protect, getDashboardStats);

export default router;