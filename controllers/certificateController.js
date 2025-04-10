import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import User from '../models/register.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration constants
const LAYOUT = {
  pageSize: [842, 595], // A4 landscape
  margins: {
    left: 50,
    right: 50,
    top: 40,
    bottom: 40
  },
  columns: {
    personal: [50, 300, 500, 650], // X positions for personal info columns
    marks: [50, 150, 400, 500, 650] // Subject table columns
  },
  fonts: {
    header: 'Helvetica-Bold',
    body: 'Helvetica',
    sizes: {
      title: 24,
      subtitle: 18,
      normal: 12,
      small: 10
    }
  },
  photo: {
    width: 120,
    height: 150,
    position: { x: 680, y: 50 }
  }
};

export const generateCertificate = async (req, res) => {
  const { rollNo } = req.params;

  try {
    const user = await User.findOne({ rollNo }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const template = certificateTemplates[user.certificationTitle];
    if (!template) return res.status(400).json({ message: 'Invalid certification title' });

    // Create temp directory
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // Generate Marks PDF
    const marksFileName = `statement_of_marks_${rollNo}.pdf`;
    const marksFilePath = path.join(tempDir, marksFileName);
    const marksDoc = new PDFDocument({ size: LAYOUT.pageSize, layout: 'landscape' });
    marksDoc.pipe(fs.createWriteStream(marksFilePath));

    // Load template background
    const marksImagePath = path.join(__dirname, '../public/certificate_templates', 'statement_of_marks.png');
    marksDoc.image(marksImagePath, 0, 0, { width: LAYOUT.pageSize[0] });

    // Set default styles
    marksDoc.font(LAYOUT.fonts.body)
           .fontSize(LAYOUT.fonts.sizes.normal)
           .fillColor('#000000');

    // Add student photo with error handling
    if (user.photo && typeof user.photo === 'string') {
      const photoPath = path.join(__dirname, '../public/photos', user.photo);
      if (fs.existsSync(photoPath)) {
        marksDoc.image(photoPath, 
          LAYOUT.photo.position.x, 
          LAYOUT.photo.position.y, 
          { 
            width: LAYOUT.photo.width,
            height: LAYOUT.photo.height,
            fit: [LAYOUT.photo.width, LAYOUT.photo.height]
          }
        );
      }
    }

    // Personal Details Section
    let currentY = LAYOUT.margins.top + 20;
    
    // Institution Header
    marksDoc.font(LAYOUT.fonts.header)
           .fontSize(LAYOUT.fonts.sizes.title)
           .text('SKILL UP INSTITUTE OF LEARNING', LAYOUT.margins.left, currentY, { align: 'center' });
    currentY += 40;

    // Personal Info Table
    const personalInfo = [
      { label: 'Date:', value: new Date().toLocaleDateString() },
      { label: 'Roll No:', value: user.rollNo },
      { label: "Candidate's Name:", value: user.fullName },
      { label: "Father's Name:", value: user.fatherName },
      { label: "Mother's Name:", value: user.motherName },
      { label: 'Course:', value: user.certificationTitle },
      { label: 'Session:', value: user.session || '2023-2024' }
    ];

    personalInfo.forEach((info, index) => {
      const col = index % 3; // 3-column layout
      const rowY = currentY + Math.floor(index/3) * 20;
      
      marksDoc.text(info.label, LAYOUT.columns.personal[col], rowY)
             .font(LAYOUT.fonts.header)
             .text(info.value, LAYOUT.columns.personal[col] + 60, rowY)
             .font(LAYOUT.fonts.body);
    });

    currentY += Math.ceil(personalInfo.length / 3) * 20 + 30;

    // Marks Table
    const tableHeader = [
      { text: 'Subject Code', width: 100 },
      { text: 'Subject Name', width: 250 },
      { text: 'Max Marks', width: 80 },
      { text: 'Min Marks', width: 80 },
      { text: 'Marks Obtained', width: 100 }
    ];

    // Draw table headers
    let xPos = LAYOUT.margins.left;
    tableHeader.forEach((header, index) => {
      marksDoc.font(LAYOUT.fonts.header)
             .rect(xPos, currentY, header.width, 20)
             .fillAndStroke('#f0f4f8', '#000000')
             .fillColor('#000000')
             .text(header.text, xPos + 5, currentY + 4, {
               width: header.width - 10,
               align: 'center'
             });
      xPos += header.width;
    });

    currentY += 20;

    // Marks Rows
    let totalMarksObtained = 0;
    template.subjects.forEach((subjectCode) => {
      const subject = subjectDetails[subjectCode];
      const examResult = user.examResults.find(r => r.subjectCode === subjectCode) || {};
      const marksObtained = (examResult.theoryMarks || 0) + (examResult.practicalMarks || 0);
      
      xPos = LAYOUT.margins.left;
      
      // Alternate row background
      marksDoc.fillColor(rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc')
             .rect(xPos, currentY, LAYOUT.pageSize[0] - LAYOUT.margins.left - LAYOUT.margins.right, 20)
             .fill();

      tableHeader.forEach((header, colIndex) => {
        let value = '';
        switch(colIndex) {
          case 0: value = subjectCode; break;
          case 1: value = subject?.name || 'N/A'; break;
          case 2: value = subject ? (subject.theory + subject.practical) : 'N/A'; break;
          case 3: value = subject ? Math.round((subject.theory + subject.practical) * 0.3) : 'N/A'; break;
          case 4: value = marksObtained; break;
        }
        
        marksDoc.fillColor('#000000')
               .text(value.toString(), xPos + 5, currentY + 4, {
                 width: header.width - 10,
                 align: 'center'
               });
        xPos += header.width;
      });

      totalMarksObtained += marksObtained;
      currentY += 20;
    });

    // Totals Section
    currentY += 30;
    marksDoc.font(LAYOUT.fonts.header)
           .text(`Total Marks Obtained:`, LAYOUT.margins.left, currentY)
           .font(LAYOUT.fonts.body)
           .text(`${totalMarksObtained} / ${template.maxMarks}`, LAYOUT.margins.left + 150, currentY);

    currentY += 20;
    marksDoc.text(`Percentage: ${((totalMarksObtained / template.maxMarks) * 100).toFixed(2)}%`, 
             LAYOUT.margins.left, currentY);

    // Verification Footer
    currentY = LAYOUT.pageSize[1] - LAYOUT.margins.bottom - 30;
    marksDoc.fontSize(LAYOUT.fonts.sizes.small)
           .text('Verified by Skill Up Institute of Learning', LAYOUT.margins.left, currentY, {
             align: 'center',
             width: LAYOUT.pageSize[0] - LAYOUT.margins.left - LAYOUT.margins.right
           });

    marksDoc.text(`Verify online: www.skillupinstitute.co.in/verify/${user.rollNo}`, 
             LAYOUT.margins.left, currentY + 20, {
               align: 'center',
               width: LAYOUT.pageSize[0] - LAYOUT.margins.left - LAYOUT.margins.right
             });

    marksDoc.end();
    await new Promise(resolve => marksDoc.on('end', resolve));

    res.json({
      marksUrl: `/api/certificates/download/${marksFileName}`,
    });

  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Keep the downloadFile function same as before

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