// controllers/examController.js
import Registered_Students from '../models/userModel.js';
import {
  CERTIFICATION_IN_COMPUTER_APPLICATION,
  DIPLOMA_IN_COMPUTER_APPLICATION,
  ADVANCE_DIPLOMA_IN_COMPUTER_APPLICATION,
  CERTIFICATION_IN_COMPUTER_ACCOUTENCY,
  DIPLOMA_IN_COMPUTER_ACCOUNTANCY
} from '../utils/Subject_code.js';

// Map certification titles to their subjects
const certificationSubjects = {
  'CERTIFICATION IN COMPUTER APPLICATION': CERTIFICATION_IN_COMPUTER_APPLICATION,
  'DIPLOMA IN COMPUTER APPLICATION': DIPLOMA_IN_COMPUTER_APPLICATION,
  'ADVANCE DIPLOMA IN COMPUTER APPLICATION': ADVANCE_DIPLOMA_IN_COMPUTER_APPLICATION,
  'CERTIFICATION IN COMPUTER ACCOUNTANCY': CERTIFICATION_IN_COMPUTER_ACCOUTENCY,
  'DIPLOMA IN COMPUTER ACCOUNTANCY': DIPLOMA_IN_COMPUTER_ACCOUNTANCY
};

// Get exam modules for a student
export const getExamModules = async (req, res) => {
  try {
    const student = await Registered_Students.findById(req.user.id); // Assuming user ID comes from auth middleware
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const subjects = certificationSubjects[student.certificationTitle];
    if (!subjects) {
      return res.status(400).json({ message: 'Invalid certification title' });
    }

    res.status(200).json({
      certificationTitle: student.certificationTitle,
      modules: subjects,
      existingResults: student.examResults
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Submit exam results
export const submitExamResults = async (req, res) => {
  try {
    const student = await Registered_Students.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const { subjectCode, practicalMarks } = req.body; // practicalMarks from frontend
    const subjects = certificationSubjects[student.certificationTitle];

    if (!subjects[subjectCode]) {
      return res.status(400).json({ message: 'Invalid subject code for this course' });
    }

    // Generate random theory marks (30-40) except for CS-01
    let theoryMarks = null;
    if (subjectCode !== 'CS-01') {
      theoryMarks = Math.floor(Math.random() * 11) + 30; // Random number between 30 and 40
    }

    const totalMarks = subjectCode === 'CS-01' 
      ? practicalMarks 
      : (theoryMarks + practicalMarks);

    // Check if result already exists
    const existingResultIndex = student.examResults.findIndex(
      result => result.subjectCode === subjectCode
    );

    if (existingResultIndex !== -1) {
      // Update existing result
      student.examResults[existingResultIndex] = {
        subjectCode,
        subjectName: subjects[subjectCode],
        theoryMarks,
        practicalMarks,
        totalMarks,
        examDate: new Date()
      };
    } else {
      // Add new result
      student.examResults.push({
        subjectCode,
        subjectName: subjects[subjectCode],
        theoryMarks,
        practicalMarks,
        totalMarks,
        examDate: new Date()
      });
    }

    // Calculate final grade when all subjects are completed
    const totalSubjects = Object.keys(subjects).length;
    if (student.examResults.length === totalSubjects) {
      const averageMarks = student.examResults.reduce((sum, result) => 
        sum + result.totalMarks, 0) / totalSubjects;
      
      student.finalGrade = calculateGrade(averageMarks);
    }

    await student.save();
    res.status(200).json({
      message: 'Exam results submitted successfully',
      examResult: student.examResults[student.examResults.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to calculate grade
const calculateGrade = (average) => {
  if (average >= 90) return 'A';
  if (average >= 80) return 'B';
  if (average >= 70) return 'C';
  if (average >= 60) return 'D';
  return 'F';
};