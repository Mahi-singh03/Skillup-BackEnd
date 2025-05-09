import Registered_Students from '../models/register';
import asyncHandler from 'express-async-handler';

// @desc    Get student details by phone number or roll number
// @route   GET /api/fees/student
// @access  Public
export const getStudentDetails = asyncHandler(async (req, res) => {
  const { phoneNumber, rollNo } = req.query;

  if (!phoneNumber && !rollNo) {
    res.status(400);
    throw new Error('Please provide either phone number or roll number');
  }

  const query = {};
  if (phoneNumber) query.phoneNumber = phoneNumber;
  if (rollNo) query.rollNo = rollNo;

  const student = await Registered_Students.findOne(query).select(
    'fullName fatherName selectedCourse courseDuration fees'
  );

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  res.status(200).json({
    success: true,
    data: {
      fullName: student.fullName,
      fatherName: student.fatherName,
      selectedCourse: student.selectedCourse,
      courseDuration: student.courseDuration,
      fees: student.fees.length > 0 ? student.fees[0] : { total: 0, paid: 0, unpaid: 0 },
    },
  });
});

// @desc    Get all students' fees with optional filters
// @route   GET /api/fees/all
// @access  Public
export const getAllStudentFees = asyncHandler(async (req, res) => {
  const { incompleteOnly } = req.query;
  
  let query = {};
  
  // Filter for students with incomplete fees (unpaid > 0)
  if (incompleteOnly === 'true') {
    query = { 'fees.unpaid': { $gt: 0 } };
  }

  const students = await Registered_Students.find(query).select(
    'fullName fatherName selectedCourse courseDuration fees rollNo phoneNumber'
  );

  const formattedStudents = students.map(student => ({
    fullName: student.fullName,
    fatherName: student.fatherName,
    selectedCourse: student.selectedCourse,
    courseDuration: student.courseDuration,
    rollNo: student.rollNo,
    phoneNumber: student.phoneNumber,
    fees: student.fees.length > 0 ? student.fees[0] : { total: 0, paid: 0, unpaid: 0 },
  }));

  res.status(200).json({
    success: true,
    count: formattedStudents.length,
    data: formattedStudents,
  });
});

// @desc    Update student fees
// @route   PUT /api/fees/update
// @access  Public
export const updateStudentFees = asyncHandler(async (req, res) => {
  const { phoneNumber, rollNo, total, paid } = req.body;

  if (!phoneNumber && !rollNo) {
    res.status(400);
    throw new Error('Please provide either phone number or roll number');
  }

  if (total === undefined || paid === undefined) {
    res.status(400);
    throw new Error('Total and paid amounts are required');
  }

  if (total < 0 || paid < 0) {
    res.status(400);
    throw new Error('Total and paid amounts cannot be negative');
  }

  if (paid > total) {
    res.status(400);
    throw new Error('Paid amount cannot exceed total amount');
  }

  const query = {};
  if (phoneNumber) query.phoneNumber = phoneNumber;
  if (rollNo) query.rollNo = rollNo;

  const student = await Registered_Students.findOne(query);

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const updatedFees = {
    total,
    paid,
    unpaid: total - paid,
  };

  // Update or create fees array
  if (student.fees.length > 0) {
    student.fees[0] = updatedFees;
  } else {
    student.fees.push(updatedFees);
  }

  await student.save();

  res.status(200).json({
    success: true,
    message: 'Fees updated successfully',
    data: {
      fullName: student.fullName,
      fatherName: student.fatherName,
      selectedCourse: student.selectedCourse,
      courseDuration: student.courseDuration,
      fees: updatedFees,
    },
  });
});