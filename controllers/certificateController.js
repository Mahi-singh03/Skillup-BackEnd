import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import User from '../models/onlineCourseRegister.js';

// Get __dirname equivalent in ES modules
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
      return res.status(400).json({ message: 'Certificate template not found' });
    }

    // Create a temporary directory if it doesn't exist
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate Completion Certificate
    const completionDoc = new PDFDocument({ size: [612, 792] }); // A4 size
    const completionFileName = `completion_certificate_${rollNo}.pdf`;
    const completionFilePath = path.join(tempDir, completionFileName);
    const completionStream = fs.createWriteStream(completionFilePath);
    completionDoc.pipe(completionStream);

    // Add completion certificate image as background
    const completionImagePath = path.join(__dirname, '../public/certificate_templates', template.template);
    completionDoc.image(completionImagePath, 0, 0, { width: 612 });

    // Overlay dynamic text (adjust coordinates based on your image)
    completionDoc.fontSize(12).fillColor('#000000');
    completionDoc.text(`This is to certify that ${user.fullName}`, 200, 300, { align: 'center' });
    completionDoc.text(`Roll No: ${user.rollNo}`, 200, 320, { align: 'center' });
    completionDoc.text(`Course Duration: ${user.courseDuration}`, 200, 340, { align: 'center' });
    completionDoc.text(`Certification Title: ${user.certificationTitle}`, 200, 360, { align: 'center' });
    completionDoc.text('You may also visit to verify your result www.skillupinstitute.co.in', 200, 380, { align: 'center' });

    completionDoc.end();

    // Generate Statement of Marks
    const marksDoc = new PDFDocument({ size: [612, 792] });
    const marksFileName = `statement_of_marks_${rollNo}.pdf`;
    const marksFilePath = path.join(tempDir, marksFileName);
    const marksStream = fs.createWriteStream(marksFilePath);
    marksDoc.pipe(marksStream);

    // Add statement of marks image as background
    const marksImagePath = path.join(__dirname, '../public/certificate_templates', 'statement_of_marks.png');
    marksDoc.image(marksImagePath, 0, 0, { width: 612 });

    // Overlay dynamic text (adjust coordinates based on your image)
    marksDoc.fontSize(12).fillColor('#000000');
    marksDoc.text(`Roll No: ${user.rollNo}`, 200, 100, { align: 'center' });
    marksDoc.text(`Candidate's Name: ${user.fullName}`, 200, 120, { align: 'center' });
    marksDoc.text(`Father's Name: ${user.fatherName}`, 200, 140, { align: 'center' });
    marksDoc.text(`Mother's Name: ${user.motherName}`, 200, 160, { align: 'center' });

    // Table for subjects (adjust coordinates to match the table in the image)
    let yPos = 200;
    marksDoc.font('Helvetica-Bold').text('Subject Code   Subject                     Maximum Marks   Minimum Marks   Marks Obtained', 50, yPos);
    yPos += 20;
    marksDoc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 20;

    template.subjects.forEach(subjectCode => {
      const subject = subjectDetails[subjectCode];
      const examResult = user.examResults.find(r => r.subjectCode === subjectCode);
      const marksObtained = examResult ? (examResult.theoryMarks || 0) + (examResult.practicalMarks || 0) : 0;
      marksDoc.text(`${subjectCode.padEnd(15)} ${subject.name.padEnd(30)} ${(subject.theory + subject.practical).toString().padEnd(15)} ${Math.round((subject.theory + subject.practical) * 0.3).toString().padEnd(15)} ${marksObtained}`, 50, yPos);
      yPos += 20;
    });

    const totalMarksObtained = user.examResults.reduce((sum, result) => {
      if (template.subjects.includes(result.subjectCode)) {
        return sum + (result.theoryMarks || 0) + (result.practicalMarks || 0);
      }
      return sum;
    }, 0);

    marksDoc.text(`Total Marks Obtained: ${totalMarksObtained} out of ${template.maxMarks}`, 200, yPos + 20, { align: 'center' });
    marksDoc.text('You may also visit to verify your result www.skillupinstitute.co.in', 200, yPos + 40, { align: 'center' });

    marksDoc.end();

    // Wait for both files to be generated
    await new Promise((resolve) => completionStream.on('finish', resolve));
    await new Promise((resolve) => marksStream.on('finish', resolve));

    // Send response with download links
    res.json({
      completionUrl: `/api/certificates/download/${completionFileName}`,
      marksUrl: `/api/certificates/download/${marksFileName}`,
    });

  } catch (error) {
    console.error('Error generating certificates:', error);
    res.status(500).json({ message: 'Error generating certificates', error: error.message });
  }
};

// Add a download endpoint to serve the files
export const downloadFile = (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, '../temp', fileName);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error downloading file' });
      }
    }
    // Optionally delete the file after download
    try {
      fs.unlinkSync(filePath);
    } catch (unlinkErr) {
      console.error('Error deleting file:', unlinkErr);
    }
  });
};