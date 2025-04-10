import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import User from '../models/register.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Certificate templates configuration
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

// Subject details configuration
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

// Coordinate configuration for elements
const coordinates = {
  date: { x: 700, y: 100 },
  rollNo: { x: 700, y: 130 },
  name: { x: 150, y: 130 },
  fatherName: { x: 150, y: 160 },
  motherName: { x: 150, y: 190 },
  photo: { x: 650, y: 150, width: 120, height: 150 },
  table: {
    startY: 260,
    rowHeight: 30,
    columns: {
      code: 50,
      subject: 150,
      maxMarks: 450,
      minMarks: 530,
      obtained: 610,
    },
  },
  totals: {
    obtained: { x: 530, y: 500 },
    percentage: { x: 530, y: 530 },
    verification: { x: 50, y: 560 },
  },
};

export const generateCertificate = async (req, res) => {
  const { rollNo } = req.params;

  try {
    // Validate rollNo
    if (!rollNo || typeof rollNo !== 'string') {
      return res.status(400).json({ message: 'Invalid roll number' });
    }

    // Fetch user data
    let user;
    try {
      user = await User.findOne({ rollNo });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ message: 'Error querying user data', error: dbError.message });
    }

    // Validate certification template
    const template = certificateTemplates[user.certificationTitle];
    if (!template) {
      return res.status(400).json({ message: 'Invalid certification title' });
    }

    // Set up temporary directory
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Define file paths
    const marksFileName = `statement_of_marks_${rollNo}.pdf`;
    const marksFilePath = path.join(tempDir, marksFileName);
    const marksImagePath = path.join(__dirname, '../public/certificate_templates', 'statement_of_marks.png');

    // Validate background image
    if (!fs.existsSync(marksImagePath)) {
      throw new Error(`Background image not found at ${marksImagePath}`);
    }

    // Initialize PDF document
    const marksDoc = new PDFDocument({ size: [842, 595], layout: 'landscape' });
    marksDoc.pipe(fs.createWriteStream(marksFilePath));

    // Add background image
    marksDoc.image(marksImagePath, 0, 0, { width: 842 });

    // Handle student photo safely
    if (user.photo && typeof user.photo === 'string' && user.photo.trim().length > 0) {
      const photoPath = path.join(__dirname, '../public/photos', user.photo);
      if (fs.existsSync(photoPath)) {
        marksDoc.image(photoPath, coordinates.photo.x, coordinates.photo.y, {
          width: coordinates.photo.width,
          height: coordinates.photo.height,
        });
      } else {
        console.warn(`Photo file not found at ${photoPath}`);
      }
    } else {
      console.warn('Invalid or missing photo data for user:', user.rollNo);
    }

    // Set font styling
    marksDoc.font('Helvetica').fontSize(12);

    // Add personal information
    marksDoc.text(new Date().toLocaleDateString(), coordinates.date.x, coordinates.date.y);
    marksDoc.text(user.rollNo, coordinates.rollNo.x, coordinates.rollNo.y);
    marksDoc.text(user.fullName || 'N/A', coordinates.name.x, coordinates.name.y);
    marksDoc.text(user.fatherName || 'N/A', coordinates.fatherName.x, coordinates.fatherName.y);
    marksDoc.text(user.motherName || 'N/A', coordinates.motherName.x, coordinates.motherName.y);

    // Generate subject table
    let currentY = coordinates.table.startY;
    template.subjects.forEach((subjectCode) => {
      const subject = subjectDetails[subjectCode];
      const examResult = user.examResults.find((r) => r.subjectCode === subjectCode);
      const marksObtained = examResult
        ? (examResult.theoryMarks || 0) + (examResult.practicalMarks || 0)
        : 0;

      marksDoc.text(subjectCode, coordinates.table.columns.code, currentY);
      marksDoc.text(subject.name, coordinates.table.columns.subject, currentY);
      marksDoc.text((subject.theory + subject.practical).toString(), coordinates.table.columns.maxMarks, currentY);
      marksDoc.text(Math.round((subject.theory + subject.practical) * 0.3).toString(), coordinates.table.columns.minMarks, currentY);
      marksDoc.text(marksObtained.toString(), coordinates.table.columns.obtained, currentY);

      currentY += coordinates.table.rowHeight;
    });

    // Calculate and add totals
    const totalMarksObtained = template.subjects.reduce((sum, subjectCode) => {
      const examResult = user.examResults.find((r) => r.subjectCode === subjectCode);
      return sum + (examResult ? (examResult.theoryMarks || 0) + (examResult.practicalMarks || 0) : 0);
    }, 0);

    const percentage = ((totalMarksObtained / template.maxMarks) * 100).toFixed(2);

    marksDoc.font('Helvetica-Bold')
      .text(totalMarksObtained.toString(), coordinates.totals.obtained.x, coordinates.totals.obtained.y)
      .text(`${percentage}%`, coordinates.totals.percentage.x, coordinates.totals.percentage.y)
      .font('Helvetica')
      .text(`Verify your result at: www.skillupinstitute.co.in`, coordinates.totals.verification.x, coordinates.totals.verification.y);

    // Finalize PDF and handle errors
    marksDoc.end();
    await new Promise((resolve, reject) => {
      marksDoc.on('end', resolve);
      marksDoc.on('error', (err) => reject(err));
    });

    // Send response
    res.json({ marksUrl: `/api/certificates/download/${marksFileName}` });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const downloadFile = (req, res) => {
  const { fileName } = req.params;
  const filePath = path.join(__dirname, '../temp', fileName);

  if (!fileName || !fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  res.download(filePath, fileName, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ message: 'Error downloading file', error: err.message });
    }
    // Clean up temporary file
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) console.error('Error deleting file:', unlinkErr);
    });
  });
};