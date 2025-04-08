import express from 'express';
import { generateCertificate, downloadFile } from '../controllers/certificateController.js';

const router = express.Router();

router.get('/generate-certificate/:rollNo', generateCertificate);
router.get('/download/:fileName', downloadFile);

export default router;