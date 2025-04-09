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

    // Generate Completion Certificate
    const completionDoc = new PDFDocument({ size: [792, 612], layout: 'landscape' });
    const completionBuffers = [];
    completionDoc.on('data', (chunk) => completionBuffers.push(chunk));
    const completionPromise = new Promise((resolve) => completionDoc.on('end', () => resolve(Buffer.concat(completionBuffers))));

    const completionImagePath = path.join(__dirname, '../public/certificate_templates', template.template);
    completionDoc.image(completionImagePath, 0, 0, { width: 792 });
    completionDoc.fontSize(12).fillColor('#000000');
    completionDoc.text(`This is to certify that ${user.fullName}`, 0, 200, { align: 'center', width: 792 });
    completionDoc.text(`Roll No: ${user.rollNo}`, 0, 220, { align: 'center', width: 792 });
    completionDoc.text(`Course Duration: ${user.courseDuration}`, 0, 240, { align: 'center', width: 792 });
    completionDoc.text(`Certification Title: ${user.certificationTitle}`, 0, 260, { align: 'center', width: 792 });
    completionDoc.text('Verify your result at www.skillupinstitute.co.in', 0, 280, { align: 'center', width: 792 });
    completionDoc.end();

    // Generate Statement of Marks
    const marksDoc = new PDFDocument({ size: [792, 612], layout: 'landscape' });
    const marksBuffers = [];
    marksDoc.on('data', (chunk) => marksBuffers.push(chunk));
    const marksPromise = new Promise((resolve) => marksDoc.on('end', () => resolve(Buffer.concat(marksBuffers))));

    const marksImagePath = path.join(__dirname, '../public/certificate_templates', 'statement_of_marks.png');
    marksDoc.image(marksImagePath, 0, 0, { width: 792 });
    marksDoc.fontSize(12).fillColor('#000000');
    marksDoc.text(`Roll No: ${user.rollNo}`, 0, 80, { align: 'center', width: 792 });
    marksDoc.text(`Candidate's Name: ${user.fullName}`, 0, 100, { align: 'center', width: 792 });
    marksDoc.text(`Father's Name: ${user.fatherName}`, 0, 120, { align: 'center', width: 792 });
    marksDoc.text(`Mother's Name: ${user.motherName}`, 0, 140, { align: 'center', width: 792 });

    let yPos = 180;
    marksDoc.font('Helvetica-Bold').text('Subject Code   Subject                     Max Marks   Min Marks   Obtained', 50, yPos);
    yPos += 20;
    marksDoc.moveTo(50, yPos).lineTo(742, yPos).stroke();
    yPos += 20;

    const totalMarksObtained = template.subjects.reduce((sum, subjectCode) => {
      const subject = subiectDetails[subjectCode];
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

    marksDoc.text(`Total Marks Obtained: ${totalMarksObtained} out of ${template.maxMarks}`, 0, yPos + 20, {
      align: 'center',
      width: 792,
    });
    marksDoc.text('Verify your result at www.skillupinstitute.co.in', 0, yPos + 40, { align: 'center', width: 792 });
    marksDoc.end();

    // Wait for both PDFs to finish
    const [completionBuffer, marksBuffer] = await Promise.all([completionPromise, marksPromise]);

    // Send Base64-encoded PDFs to client
    res.json({
      completionPdf: completionBuffer.toString('base64'),
      marksPdf: marksBuffer.toString('base64'),
    });
  } catch (error) {
    console.error('Error generating certificate preview:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};