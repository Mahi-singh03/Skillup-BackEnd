import express from 'express';
import { register, login, getStudentByRollNo, updateStudentPhoto } from '../controllers/registerController.js';
import { searchStudent, editStudent, addExamResult } from '../controllers/editstudent.js';

const router = express.Router();

// Authentication routes
router.post('/register', register);
router.post('/login', login);

// Student management routes
router.get('/search', searchStudent);
router.put('/edit', editStudent);
router.post('/exam-result', addExamResult);
router.get('/rollno/:rollNo', getStudentByRollNo);
router.post('/photo', updateStudentPhoto);

export default router;