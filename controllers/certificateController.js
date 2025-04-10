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

    // Generate Statement of Marks (focusing on horizontal layout)
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
        marksDoc.image(photoPath, 50, 50, { width: 150, height: 150 }); // Top-left corner
      }
    }

    marksDoc.fontSize(14).fillColor('#000000');

    // Horizontal layout for personal details
    const startY = 100;
    marksDoc.text(`Date: `, 50, startY);
    marksDoc.text(`${new Date().toLocaleDateString()}`, 100, startY); // Dynamic date
    marksDoc.text(`Roll No: ${user.rollNo}`, 200, startY);
    marksDoc.text(`Candidate's Name: ${user.fullName}`, 300, startY);
    marksDoc.text(`Father's Name: ${user.fatherName}`, 450, startY);
    marksDoc.text(`Mother's Name: ${user.motherName}`, 600, startY);

    // Subject table header (horizontal arrangement)
    const tableY = startY + 50;
    marksDoc.font('Helvetica-Bold').text(
      'Subject Code   Subject                     Max Marks   Min Marks   Marks Obtained',
      50,
      tableY,
      { width: 742, align: 'left' }
    );
    marksDoc.moveTo(50, tableY + 20).lineTo(792, tableY + 20).stroke(); // Horizontal line

    // Subject table data
    let rowY = tableY + 40;
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
        rowY,
        { width: 742, align: 'left' }
      );
      rowY += 20;
      return sum + marksObtained;
    }, 0);

    // Total marks and verification
    marksDoc.text(`Total Marks Obtained: ${totalMarksObtained} out of ${template.maxMarks}`, 50, rowY + 20);
    marksDoc.text(
      `Verify your result at www.skillupinstitute.co.in`,
      50,
      rowY + 40,
      { width: 742, align: 'left' }
    );
    marksDoc.text(
      `Who has successfully completed his/her Course of`,
      50,
      rowY + 60,
      { width: 742, align: 'left' }
    );

    marksDoc.end();

    // Wait for file to finish writing
    await new Promise((resolve) => marksDoc.on('end', resolve));

    res.json({
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
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) console.error('Error deleting file:', unlinkErr);
    });
  });
};