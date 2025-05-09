import express from 'express';
import { getStudentDetails, updateStudentFees, getAllStudentFees } from '../controllers/fees.js';

const router = express.Router();

router.get('/student', getStudentDetails);
router.put('/update', updateStudentFees);
router.get('/getAll', getAllStudentFees);

export default router;