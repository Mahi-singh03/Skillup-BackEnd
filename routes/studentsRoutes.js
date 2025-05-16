import express from 'express';
import { register, login, getStudentByRollNo, updateStudentPhoto } from '../controllers/registerController.js';
import editStudent from "../controllers/editStudent.js"

const router = express.Router();
router.post('/register', register);
router.post('/login', login);

// Student routes
router.post('/student/register', register);
router.post('/student/login', login);

router.get('/rollno/:rollNo', getStudentByRollNo);
router.post('/student/photo', updateStudentPhoto);


router.put('/edit', editStudent);

export default router;