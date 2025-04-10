import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import User from '../models/register.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const certificateTemplates = {
  'CERTIFICATION IN COMPUTER APPLICATION': {
    subjects: ['CS-01', 'CS-02', 'CS-03', 'CS-04'],
    maxMarks: 240,
    minMarks: 72,
    template: 'completion_certificate.png',
  },
  'DIPLOMA IN COMPUTER APPLICATION': {
    subjects: ['CS-01', 'CS-02', 'CS-03', 'CS-04', 'CS-05'],
    maxMarks: 300,
    minMarks: 90,
    template: 'completion_certificate.png',
  },
  'ADVANCE DIPLOMA IN COMPUTER APPLICATION': {
    subjects: ['CS-01', 'CS-02', 'CS-03', 'CS-05', 'CS-06'],
    maxMarks: 300,
    minMarks: 90,
    template: 'completion_certificate.png',
  },
  'CERTIFICATION IN COMPUTER ACCOUNTANCY': {
    subjects: ['CS-01', 'CS-02', 'CS-07', 'CS-08'],
    maxMarks: 240,
    minMarks: 72,
    template: 'completion_certificate.png',
  },
  'DIPLOMA IN COMPUTER ACCOUNTANCY': {
    subjects: ['CS-01', 'CS-02', 'CS-07', 'CS-08', 'CS-09'],
    maxMarks: 300,
    minMarks: 90,
    template: 'completion_certificate.png',
  },
};

const subjectDetails = {
  'CS-01': { name: 'Basic Computer', theory: 100, practical: 0 },
  'CS-02': { name: 'Windows Application: MS Office', theory: 40, practical: 60 },
  'CS-03': { name: 'Operating System', theory: 40, practical: 60 },
  'CS-04': { name: 'Web Publisher: Internet Browsing', theory: 40, practical: 60 },
  'CS-05': { name: 'COMPUTER ACCOUNTANCY: TALLY', theory: 40, practical: 60 },
  'CS-06': { name: 'DESKTOP PUBLISHING: PHOTOSHOP', theory: 40, practical: 60 },
  'CS-07': { name: 'Computerized Accounting With Tally', theory: 40, practical: 60 },
  'CS-08': { name: 'Manual Accounting', theory: 40, practical: 60 },
  'CS-09': { name: 'Tally ERP 9 & Tally Prime', theory: 40, practical: 60 },
};

export const generateCertificate = async (req, res) => {
  const { rollNo } = req.params;

  try {
    const user = await User.findOne({ rollNo });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const template = certificateTemplates[user.certificationTitle];
    if (!template) {
      return res.status(400).json({ message: 'Invalid certification title' });
    }

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate Completion Certificate
    const completionFileName = `completion_certificate_${rollNo}.pdf`;
    const completionFilePath = path.join(tempDir, completionFileName);
    const completionDoc = new PDFDocument({ size: [842, 595], layout: 'landscape' }); // A4 landscape
    completionDoc.pipe(fs.createWriteStream(completionFilePath));

    const completionImagePath = path.join(__dirname, '../public/certificate_templates', template.template);
    completionDoc.image(completionImagePath, 0, 0, { width: 842 }); // Scale to A4 width

    // Add student photo
    if (user.photo && typeof user.photo === 'string') { // Ensure photo is a string
      const photoPath = path.join(__dirname, '../public/photos', user.photo);
      if (fs.existsSync(photoPath)) {
        completionDoc.image(photoPath, 50, 50, { width: 150, height: 150 }); // Position and size photo
      } else {
        console.warn(`Photo not found at ${photoPath}`);
      }
    } else {
      console.warn('Invalid photo data in user model, expected string filename');
    }

    completionDoc.fontSize(14).fillColor('#000000');
    completionDoc.text(`This is to certify that ${user.fullName}`, 400, 100, { align: 'center' });
    completionDoc.text(`Roll No: ${user.rollNo}`, 400, 130, { align: 'center' });
    completionDoc.text(`Course Duration: ${user.courseDuration}`, 400, 160, { align: 'center' });
    completionDoc.text(`Certification Title: ${user.certificationTitle}`, 400, 190, { align: 'center' });
    completionDoc.text('Verify your result at www.skillupinstitute.co.in', 400, 220, { align: 'center' });
    completionDoc.end();

    // Generate Statement of Marks
    const marksFileName = `statement_of_marks_${rollNo}.pdf`;
    const marksFilePath = path.join(tempDir, marksFileName);
    const marksDoc = new PDFDocument({ size: [842, 595], layout: 'landscape' }); // A4 landscape
    marksDoc.pipe(fs.createWriteStream(marksFilePath));

    const marksImagePath = path.join(__dirname, '../public/certificate_templates', 'statement_of_marks.png');
    marksDoc.image(marksImagePath, 0, 0, { width: 842 }); // Scale to A4 width

    // Add student photo
    if (user.photo && typeof user.photo === 'string') {
      const photoPath = path.join(__dirname, '../public/photos', user.photo);
      if (fs.existsSync(photoPath)) {
        marksDoc.image(photoPath, 50, 50, { width: 150, height: 150 }); // Position and size photo
      }
    }

    marksDoc.fontSize(14).fillColor('#000000');
    marksDoc.text(`Roll No: ${user.rollNo}`, 400, 100, { align: 'center' });
    marksDoc.text(`Candidate's Name: ${user.fullName}`, 400, 130, { align: 'center' });
    marksDoc.text(`Father's Name: ${user.fatherName}`, 400, 160, { align: 'center' });
    marksDoc.text(`Mother's Name: ${user.motherName}`, 400, 190, { align: 'center' });

    let yPos = 250;
    marksDoc.font('Helvetica-Bold').text('Subject Code   Subject                     Max Marks   Min Marks   Obtained', 50, yPos);
    yPos += 20;
    marksDoc.moveTo(50, yPos).lineTo(790, yPos).stroke(); // Adjust line to A4 width
    yPos += 20;

    const totalMarksObtained = template.subjects.reduce((sum, subjectCode) => {
      const subject = subjectDetails[subjectCode];
      const examResult = user.examResults.find((r) => r.subjectCode === subjectCode);
      const marksObtained = examResult ? (examResult.theoryMarks || 0) + (examResult.practicalMarks || 0) : 0;
      marksDoc.text(
        `${subjectCode.padEnd(15)} ${subject.name.padEnd(30)} ${(subject.theory + subject.practical)
          .toString()
          .padEnd(15)} ${Math.round((subject.theory + subject.practical) * 0.3)
          .toString()
          .padEnd(15)} ${marksObtained}`,
        50,
        yPos
      );
      yPos += 20;
      return sum + marksObtained;
    }, 0);

    marksDoc.text(`Total Marks Obtained: ${totalMarksObtained} out of ${template.maxMarks}`, 400, yPos + 20, {
      align: 'center',
    });
    marksDoc.text('Verify your result at www.skillupinstitute.co.in', 400, yPos + 40, { align: 'center' });
    marksDoc.end();

    // Wait for files to finish writing
    await Promise.all([
      new Promise((resolve) => completionDoc.on('end', resolve)),
      new Promise((resolve) => marksDoc.on('end', resolve)),
    ]);

    res.json({
      completionUrl: `/api/certificates/download/${completionFileName}`,
      marksUrl: `/api/certificates/download/${marksFileName}`,
    });
  } catch (error) {
    console.error('Error generating certificates:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const downloadFile = (req, res) => {
  const { fileName } = req.params;
  const filePath = path.join(__dirname, '../temp', fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  res.download(filePath, fileName, (err) => {
    if (err) {
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error downloading file' });
      }
      console.error('Download error:', err);
    }
    // Clean up file after download
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) console.error('Error deleting file:', unlinkErr);
    });
  });
};