import express from 'express';
const router = express.Router();
import { generateCertificate, downloadFile } from '../controllers/certificateController.js';

router.get('/generate-certificate/:rollNo', generateCertificate);
router.get('/download/:fileName', downloadFile);

export default router;