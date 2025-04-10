import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import User from '../models/register.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Coordinate configuration for elements (adjust based on actual background image)
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
      obtained: 610
    }
  },
  totals: {
    obtained: { x: 530, y: 500 },
    percentage: { x: 530, y: 530 },
    verification: { x: 50, y: 560 }
  }
};

export const generateCertificate = async (req, res) => {
  const { rollNo } = req.params;

  try {
    const user = await User.findOne({ rollNo });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const template = certificateTemplates[user.certificationTitle];
    if (!template) return res.status(400).json({ message: 'Invalid certification title' });

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // PDF Setup
    const marksFileName = `statement_of_marks_${rollNo}.pdf`;
    const marksFilePath = path.join(tempDir, marksFileName);
    const marksDoc = new PDFDocument({ size: [842, 595], layout: 'landscape' });
    marksDoc.pipe(fs.createWriteStream(marksFilePath));

    // Add background image
    const marksImagePath = path.join(__dirname, '../public/certificate_templates', 'statement_of_marks.png');
    marksDoc.image(marksImagePath, 0, 0, { width: 842 });

    // Add student photo
    if (user.photo) {
      const photoPath = path.join(__dirname, '../public/photos', user.photo);
      if (fs.existsSync(photoPath)) {
        marksDoc.image(photoPath, coordinates.photo.x, coordinates.photo.y, {
          width: coordinates.photo.width,
          height: coordinates.photo.height
        });
      }
    }

    // Set consistent font styling
    marksDoc.font('Helvetica').fontSize(12);

    // Personal Information
    marksDoc.text(new Date().toLocaleDateString(), coordinates.date.x, coordinates.date.y);
    marksDoc.text(user.rollNo, coordinates.rollNo.x, coordinates.rollNo.y);
    marksDoc.text(user.fullName, coordinates.name.x, coordinates.name.y);
    marksDoc.text(user.fatherName, coordinates.fatherName.x, coordinates.fatherName.y);
    marksDoc.text(user.motherName, coordinates.motherName.x, coordinates.motherName.y);

    // Subject Table
    let currentY = coordinates.table.startY;
    template.subjects.forEach((subjectCode) => {
      const subject = subjectDetails[subjectCode];
      const examResult = user.examResults.find(r => r.subjectCode === subjectCode);
      const marksObtained = examResult ? (examResult.theoryMarks || 0) + (examResult.practicalMarks || 0) : 0;

      marksDoc.text(subjectCode, coordinates.table.columns.code, currentY);
      marksDoc.text(subject.name, coordinates.table.columns.subject, currentY);
      marksDoc.text((subject.theory + subject.practical).toString(), coordinates.table.columns.maxMarks, currentY);
      marksDoc.text(Math.round((subject.theory + subject.practical) * 0.3).toString(), coordinates.table.columns.minMarks, currentY);
      marksDoc.text(marksObtained.toString(), coordinates.table.columns.obtained, currentY);

      currentY += coordinates.table.rowHeight;
    });

    // Totals and Verification
    const totalMarksObtained = template.subjects.reduce((sum, subjectCode) => {
      const examResult = user.examResults.find(r => r.subjectCode === subjectCode);
      return sum + (examResult ? (examResult.theoryMarks || 0) + (examResult.practicalMarks || 0) : 0);
    }, 0);

    const percentage = ((totalMarksObtained / template.maxMarks) * 100).toFixed(2);

    marksDoc.font('Helvetica-Bold')
      .text(totalMarksObtained.toString(), coordinates.totals.obtained.x, coordinates.totals.obtained.y)
      .text(`${percentage}%`, coordinates.totals.percentage.x, coordinates.totals.percentage.y)
      .font('Helvetica')
      .text(`Verify your result at: www.skillupinstitute.co.in`, coordinates.totals.verification.x, coordinates.totals.verification.y);

    marksDoc.end();

    await new Promise(resolve => marksDoc.on('end', resolve));

    res.json({ marksUrl: `/api/certificates/download/${marksFileName}` });
  } catch (error) {
    console.error('Error generating certificates:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Keep downloadFile function as is

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