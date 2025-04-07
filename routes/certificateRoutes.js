const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');

router.get('/generate-certificate/:rollNo', certificateController.generateCertificate);
router.get('/download/:fileName', certificateController.downloadFile);

module.exports = router;