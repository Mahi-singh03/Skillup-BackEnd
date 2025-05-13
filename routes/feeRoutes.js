import express from 'express';
import { getAllStudentFees, updateStudentFees, getAllStudentFees } from '../controllers/fees.js';

const router = express.Router();

router.get('/student', getAllStudentFees);
router.put('/update', updateStudentFees);
router.get('/getAll', getAllStudentFees);

export default router;