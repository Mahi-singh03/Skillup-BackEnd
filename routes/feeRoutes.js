import express from 'express';
import { getStudentDetails, updateStudentFees } from '../controllers/fees.js';

const router = express.Router();

router.get('/student', getStudentDetails);
router.put('/update', updateStudentFees);

export default router;