import express from 'express';
import { register, login, getStudentByRollNo} from '../controllers/registerController.js';

const router = express.Router();

// These routes will now be accessible at:
// POST /api/register
// POST /api/login
router.post('/register', register);
router.post('/login', login);

// Student routes
router.post('/student/register', register);
router.post('/student/login', login);

router.get('/rollno/:rollNo', getStudentByRollNo);

export default router;