import express from 'express';
import RegisteredStudents from '../models/register.js'
const router = express.Router();

// Verify student
router.post('/verify-student', async (req, res) => {
  try {
    const { rollNo, dateOfBirth } = req.body;

    // Find student by rollNo and dateOfBirth
    const student = await RegisteredStudents.findOne({ rollNo, dateOfBirth });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Return student details
    res.status(200).json({
      fullName: student.fullName,
      fatherName: student.fatherName,
      address: student.address,
      course: student.selectedCourse,
      courseDuration: student.courseDuration,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;