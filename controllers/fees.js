import Registered_Students from '../models/register.js';
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
    'fullName fatherName selectedCourse courseDuration feeDetails'
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
      feeDetails: student.feeDetails,
    },
  });
});

// @desc    Get all students' fees with optional filters
// @route   GET /api/fees/all
// @access  Public
export const getAllStudentFees = asyncHandler(async (req, res) => {
  const { incompleteOnly } = req.query;
  
  let query = {};
  
  // Filter for students with incomplete fees (remainingFees > 0)
  if (incompleteOnly === 'true') {
    query = { 'feeDetails.remainingFees': { $gt: 0 } };
  }

  const students = await Registered_Students.find(query).select(
    'fullName fatherName selectedCourse courseDuration feeDetails rollNo phoneNumber'
  );

  const formattedStudents = students.map(student => ({
    fullName: student.fullName,
    fatherName: student.fatherName,
    selectedCourse: student.selectedCourse,
    courseDuration: student.courseDuration,
    rollNo: student.rollNo,
    phoneNumber: student.phoneNumber,
    feeDetails: student.feeDetails,
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
  const { phoneNumber, rollNo, totalFees, paidAmount, installmentIndex } = req.body;

  if (!phoneNumber && !rollNo) {
    res.status(400);
    throw new Error('Please provide either phone number or roll number');
  }

  if (totalFees === undefined && paidAmount === undefined && installmentIndex === undefined) {
    res.status(400);
    throw new Error('At least one of totalFees, paidAmount, or installmentIndex is required');
  }

  if (totalFees !== undefined && totalFees < 0) {
    res.status(400);
    throw new Error('Total fees cannot be negative');
  }

  if (paidAmount !== undefined && paidAmount < 0) {
    res.status(400);
    throw new Error('Paid amount cannot be negative');
  }

  const query = {};
  if (phoneNumber) query.phoneNumber = phoneNumber;
  if (rollNo) query.rollNo = rollNo;

  const student = await Registered_Students.findOne(query);
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Update totalFees if provided
  if (totalFees !== undefined) {
    student.feeDetails.totalFees = totalFees;
    // Recalculate installments if totalFees changes
    const amountPerInstallment = Math.floor(totalFees / student.feeDetails.installments);
    const remainingAmount = totalFees % student.feeDetails.installments;
    
    student.feeDetails.installmentDetails = Array.from({ length: student.feeDetails.installments }, (_, index) => {
      const existingInstallment = student.feeDetails.installmentDetails[index] || {};
      const submissionDate = existingInstallment.submissionDate || new Date(student.joiningDate);
      submissionDate.setMonth(submissionDate.getMonth() + index);
      
      return {
        amount: index === 0 ? amountPerInstallment + remainingAmount : amountPerInstallment,
        submissionDate,
        paid: existingInstallment.paid || false
      };
    });
  }

  // Update specific installment payment if paidAmount and installmentIndex are provided
  if (paidAmount !== undefined && installmentIndex !== undefined) {
    if (installmentIndex < 0 || installmentIndex >= student.feeDetails.installmentDetails.length) {
      res.status(400);
      throw new Error('Invalid installment index');
    }

    const installment = student.feeDetails.installmentDetails[installmentIndex];
    if (paidAmount > installment.amount) {
      res.status(400);
      throw new Error('Paid amount cannot exceed installment amount');
    }

    installment.paid = paidAmount === installment.amount;
  }

  // Recalculate remainingFees
  const totalPaid = student.feeDetails.installmentDetails.reduce((sum, installment) => {
    return installment.paid ? sum + installment.amount : sum;
  }, 0);
  student.feeDetails.remainingFees = student.feeDetails.totalFees - totalPaid;

  if (student.feeDetails.remainingFees < 0) {
    res.status(400);
    throw new Error('Remaining fees cannot be negative');
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
      feeDetails: student.feeDetails,
    },
  });
});