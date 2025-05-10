import Registered_Students from '../models/register.js';
import asyncHandler from 'express-async-handler';

// Utility function to build query for phoneNumber or rollNo
const buildStudentQuery = (phoneNumber, rollNo) => {
  if (!phoneNumber && !rollNo) {
    throw new Error('Please provide either phone number or roll number');
  }

  if (phoneNumber && rollNo) {
    throw new Error('Please provide only one of phone number or roll number');
  }

  if (phoneNumber && !/^\d{10}$/.test(phoneNumber)) {
    throw new Error('Phone number must be a 10-digit number');
  }

  if (rollNo && !/^[A-Za-z0-9]+$/.test(rollNo)) {
    throw new Error('Roll number must be alphanumeric');
  }

  const query = {};
  if (phoneNumber) query.phoneNumber = phoneNumber;
  if (rollNo) query.rollNo = rollNo;

  return query;
};

// @desc    Get student details by phone number or roll number
// @route   GET /api/fees/student
// @access  Public
export const getStudentDetails = asyncHandler(async (req, res) => {
  const { phoneNumber, rollNo } = req.query;

  const query = buildStudentQuery(phoneNumber, rollNo);

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
      fees: student.fees.length > 0 ? student.fees[0] : { total: 0, paid: 0, unpaid: 0, installments: [] },
    },
  });
});

// @desc    Get all students' fees with optional filters
// @route   GET /api/fees/all
// @access  Public
export const getAllStudentFees = asyncHandler(async (req, res) => {
  const { incompleteOnly } = req.query;

  let query = {};
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
    fees: student.fees.length > 0 ? student.fees[0] : { total: 0, paid: 0, unpaid: 0, installments: [] },
  }));

  res.status(200).json({
    success: true,
    count: formattedStudents.length,
    data: formattedStudents,
  });
});

// @desc    Update student fees with installment payment
// @route   PUT /api/fees/update
// @access  Public
export const updateStudentFees = asyncHandler(async (req, res) => {
  const { phoneNumber, rollNo, total, installmentAmount, installmentDate } = req.body;

  const query = buildStudentQuery(phoneNumber, rollNo);

  // Validate inputs
  if (total === undefined && installmentAmount === undefined) {
    res.status(400);
    throw new Error('Either total or installment amount is required');
  }

  if (installmentAmount !== undefined && (!Number.isFinite(installmentAmount) || installmentAmount <= 0)) {
    res.status(400);
    throw new Error('Installment amount must be a positive number');
  }

  if (total !== undefined && (!Number.isFinite(total) || total < 0)) {
    res.status(400);
    throw new Error('Total amount must be non-negative');
  }

  if (installmentDate && isNaN(Date.parse(installmentDate))) {
    res.status(400);
    throw new Error('Invalid installment date');
  }

  const student = await Registered_Students.findOne(query);

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  let fees = student.fees.length > 0 ? student.fees[0] : { total: 0, paid: 0, unpaid: 0, installments: [] };

  // Set or update total if provided
  if (total !== undefined) {
    fees.total = total;
    fees.unpaid = total - fees.paid;
  }

  // Add new installment if provided
  if (installmentAmount !== undefined) {
    if (installmentAmount > fees.unpaid) {
      res.status(400);
      throw new Error('Installment amount cannot exceed unpaid amount');
    }

    fees.paid += installmentAmount;
    fees.unpaid = fees.total - fees.paid;

    fees.installments.push({
      amount: installmentAmount,
      date: installmentDate ? new Date(installmentDate) : new Date(),
    });
  }

  // Validate consistency
  const totalPaid = fees.installments.reduce((sum, inst) => sum + inst.amount, 0);
  if (totalPaid !== fees.paid) {
    res.status(500);
    throw new Error('Inconsistent paid amount detected');
  }

  // Update or create fees array
  if (student.fees.length > 0) {
    student.fees[0] = fees;
  } else {
    student.fees.push(fees);
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
      fees,
    },
  });
});