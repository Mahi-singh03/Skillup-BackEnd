const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const User = require('../models/userModel');

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

exports.generateCertificate = async (req, res) => {
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

    // Generate Completion Certificate
    const completionDoc = new PDFDocument({ size: [612, 792] }); // A4 size
    const completionFileName = `completion_certificate_${rollNo}.pdf`;
    const completionStream = fs.createWriteStream(completionFileName);
    completionDoc.pipe(completionStream);

    // Add completion certificate image as background
    const completionImagePath = path.join(__dirname, '../public/certificate_templates', 'completion_certificate.png');
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
    const marksStream = fs.createWriteStream(marksFileName);
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
      marksDoc.text(`${subjectCode}   ${subject.name}   ${subject.theory + subject.practical}   ${Math.round((subject.theory + subject.practical) * 0.3)}   ${marksObtained}`, 50, yPos);
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

    // Send both certificates individually
    completionStream.on('finish', () => {
      marksStream.on('finish', () => {
        res.setHeader('Content-Type', 'application/json');
        res.json({
          completionUrl: `/download/${completionFileName}`,
          marksUrl: `/download/${marksFileName}`,
        });
      });
    });

    // Cleanup files after sending (optional, adjust based on your needs)
    completionStream.on('finish', () => fs.unlinkSync(completionFileName));
    marksStream.on('finish', () => fs.unlinkSync(marksFileName));

  } catch (error) {
    res.status(500).json({ message: 'Error generating certificates', error });
  }
};

// Add a download endpoint to serve the files
exports.downloadFile = (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, '..', fileName);
  res.download(filePath, (err) => {
    if (err) console.error(err);
    fs.unlinkSync(filePath); // Clean up file after download
  });
};

module.exports = { generateCertificate, downloadFile };