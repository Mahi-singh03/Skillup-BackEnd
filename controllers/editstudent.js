import Registered_Students from '../models/register.js';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';

// Subject code mappings
const CERTIFICATION_IN_COMPUTER_APPLICATION = {
  "CS-01": "Basic Computer",
  "CS-02": "Windows Application: MS Office",
  "CS-03": "Operating System",
  "CS-04": "Web Publisher: Internet Browsing"
};

const DIPLOMA_IN_COMPUTER_APPLICATION = {
  "CS-01": "Basic Computer",
  "CS-02": "Windows Application: MS Office",
  "CS-03": "Operating System",
  "CS-04": "Web Publisher: Internet Browsing",
  "CS-05": "Computer Accountancy: Tally"
};

const ADVANCE_DIPLOMA_IN_COMPUTER_APPLICATION = {
  "CS-01": "Basic Computer",
  "CS-02": "Windows Application: MS Office",
  "CS-03": "Operating System",
  "CS-05": "Computer Accountancy: Tally",
  "CS-06": "Desktop Publishing: Photoshop"
};

const CERTIFICATION_IN_COMPUTER_ACCOUNTANCY = {
  "CS-01": "Basic Computer",
  "CS-02": "Windows Application: MS Office",
  "CS-07": "Computerized Accounting With Tally",
  "CS-08": "Manual Accounting"
};

const DIPLOMA_IN_COMPUTER_ACCOUNTANCY = {
  "CS-01": "Basic Computer",
  "CS-02": "Windows Application: MS Office",
  "CS-07": "Computerized Accounting With Tally",
  "CS-08": "Manual Accounting",
  "CS-09": "Tally ERP 9 & Tally Prime"
};

// Map certification titles to subject codes
const certificationSubjectMap = {
  'CERTIFICATION IN COMPUTER APPLICATION': CERTIFICATION_IN_COMPUTER_APPLICATION,
  'DIPLOMA IN COMPUTER APPLICATION': DIPLOMA_IN_COMPUTER_APPLICATION,
  'ADVANCE DIPLOMA IN COMPUTER APPLICATION': ADVANCE_DIPLOMA_IN_COMPUTER_APPLICATION,
  'CERTIFICATION IN COMPUTER ACCOUNTANCY': CERTIFICATION_IN_COMPUTER_ACCOUNTANCY,
  'DIPLOMA IN COMPUTER ACCOUNTANCY': DIPLOMA_IN_COMPUTER_ACCOUNTANCY,
};

// Utility function to build query for phoneNumber or rollNo
const buildStudentQuery = (phoneNumber, rollNo) => {
  if (!phoneNumber && !rollNo) {
    throw new Error('Please provide either phone number or roll number');
  }

  // Allow both but prioritize rollNo if provided
  const query = {};
  if (rollNo) {
    if (!/^[A-Za-z0-9]+$/.test(rollNo)) {
      throw new Error('Roll number must be alphanumeric');
    }
    query.rollNo = rollNo;
  } else if (phoneNumber) {
    if (!/^\d{10}$/.test(phoneNumber)) {
      throw new Error('Phone number must be a 10-digit number');
    }
    query.phoneNumber = phoneNumber;
  }

  return query;
};

// @desc    Search for a student by phoneNumber or rollNo
// @route   GET /api/students/search
// @access  Public
export const searchStudent = asyncHandler(async (req, res) => {
  const { phoneNumber, rollNo } = req.query;

  const query = buildStudentQuery(phoneNumber, rollNo);

  const student = await Registered_Students.findOne(query).select('-password');
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  res.status(200).json({
    success: true,
    message: 'Student found successfully',
    data: student,
  });
});

// @desc    Edit student details and exam results
// @route   PUT /api/students/edit
// @access  Public
export const editStudent = asyncHandler(async (req, res) => {
  const {
    phoneNumber,
    rollNo,
    fullName,
    gender,
    fatherName,
    motherName,
    parentsPhoneNumber,
    emailAddress,
    dateOfBirth,
    aadharNumber,
    selectedCourse,
    courseDuration,
    address,
    qualification,
    password,
    certificate,
    joiningDate,
    fees, // Expecting { total, installmentAmount, installmentDate }
    examResults, // Expecting [{ subjectCode, theoryMarks, practicalMarks, examDate }]
    finalGrade,
  } = req.body;

  const query = buildStudentQuery(phoneNumber, rollNo);

  // Find the student
  const student = await Registered_Students.findOne(query);
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Validate provided fields
  if (emailAddress && !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(emailAddress)) {
    res.status(400);
    throw new Error('Please provide a valid email address');
  }

  if (aadharNumber && !/^[0-9]{12}$/.test(aadharNumber)) {
    res.status(400);
    throw new Error('Aadhar number must be a 12-digit number');
  }

  if (parentsPhoneNumber && !/^\d{10}$/.test(parentsPhoneNumber)) {
    res.status(400);
    throw new Error('Parents phone number must be a 10-digit number');
  }

  if (password && password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters long');
  }

  if (gender && !['male', 'female', 'other'].includes(gender.toLowerCase())) {
    res.status(400);
    throw new Error('Gender must be male, female, or other');
  }

  if (selectedCourse && !['HTML, CSS, JS', 'React', 'MERN FullStack', 'Autocad', 'CorelDRAW', 'Tally', 'Premier Pro', 'WordPress', 'Computer Course', 'MS Office', 'PTE'].includes(selectedCourse)) {
    res.status(400);
    throw new Error('Invalid course selection');
  }

  if (courseDuration && !['3 months', '6 months', '1 year'].includes(courseDuration)) {
    res.status(400);
    throw new Error('Invalid course duration');
  }

  if (qualification && !['10th', '12th', 'Graduated'].includes(qualification)) {
    res.status(400);
    throw new Error('Invalid qualification');
  }

  if (dateOfBirth && isNaN(Date.parse(dateOfBirth))) {
    res.status(400);
    throw new Error('Invalid date of birth');
  }

  if (joiningDate && isNaN(Date.parse(joiningDate))) {
    res.status(400);
    throw new Error('Invalid joining date');
  }

  if (finalGrade && !['A', 'B', 'C', 'D', 'F', 'Pending'].includes(finalGrade)) {
    res.status(400);
    throw new Error('Invalid final grade');
  }

  // Check for unique constraints
  if (emailAddress && emailAddress !== student.emailAddress) {
    const emailExists = await Registered_Students.findOne({ emailAddress });
    if (emailExists) {
      res.status(400);
      throw new Error('Email address is already in use');
    }
  }

  if (aadharNumber && aadharNumber !== student.aadharNumber) {
    const aadharExists = await Registered_Students.findOne({ aadharNumber });
    if (aadharExists) {
      res.status(400);
      throw new Error('Aadhar number is already in use');
    }
  }

  // Prepare update object
  const updateData = {};

  if (fullName) updateData.fullName = fullName;
  if (gender) updateData.gender = gender.toLowerCase();
  if (fatherName) updateData.fatherName = fatherName;
  if (motherName) updateData.motherName = motherName;
  if (parentsPhoneNumber) updateData.parentsPhoneNumber = parentsPhoneNumber;
  if (emailAddress) updateData.emailAddress = emailAddress;
  if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
  if (aadharNumber) updateData.aadharNumber = aadharNumber;
  if (selectedCourse) updateData.selectedCourse = selectedCourse;
  if (courseDuration) updateData.courseDuration = courseDuration;
  if (address) updateData.address = address;
  if (qualification) updateData.qualification = qualification;
  if (certificate !== undefined) updateData.certificate = certificate;
  if (joiningDate) updateData.joiningDate = new Date(joiningDate);
  if (finalGrade) updateData.finalGrade = finalGrade;

  // Handle password update
  if (password) {
    updateData.password = await bcrypt.hash(password, 12);
  }

  // Handle fees update
  if (fees) {
    let studentFees = student.fees.length > 0 ? student.fees[0] : { total: 0, paid: 0, unpaid: 0, installments: [] };

    if (fees.total !== undefined) {
      if (!Number.isFinite(fees.total) || fees.total < 0) {
        res.status(400);
        throw new Error('Total amount must be non-negative');
      }
      studentFees.total = fees.total;
      studentFees.unpaid = fees.total - studentFees.paid;
    }

    if (fees.installmentAmount !== undefined) {
      const installmentAmount = parseFloat(fees.installmentAmount);
      if (!Number.isFinite(installmentAmount) || installmentAmount <= 0) {
        res.status(400);
        throw new Error('Installment amount must be a positive number');
      }
      if (installmentAmount > studentFees.unpaid) {
        res.status(400);
        throw new Error('Installment amount cannot be greater than unpaid amount');
      }

      studentFees.paid += installmentAmount;
      studentFees.unpaid = studentFees.total - studentFees.paid;

      studentFees.installments.push({
        amount: installmentAmount,
        date: fees.installmentDate ? new Date(fees.installmentDate) : new Date(),
      });
    }

    // Validate fees consistency
    const totalPaid = studentFees.installments.reduce((sum, inst) => sum + inst.amount, 0);
    if (totalPaid !== studentFees.paid) {
      res.status(500);
      throw new Error('Inconsistent paid amount detected');
    }

    updateData.fees = [studentFees];
  }

  // Handle exam results update
  if (examResults && Array.isArray(examResults)) {
    const validSubjects = certificationSubjectMap[student.certificationTitle] || {};
    const updatedExamResults = [];

    for (const result of examResults) {
      const { subjectCode, theoryMarks, practicalMarks, examDate } = result;

      if (!subjectCode || !validSubjects[subjectCode]) {
        res.status(400);
        throw new Error(`Invalid subject code: ${subjectCode} for certification: ${student.certificationTitle}`);
      }

      if (theoryMarks !== undefined && (!Number.isFinite(theoryMarks) || theoryMarks < 0)) {
        res.status(400);
        throw new Error('Theory marks must be a non-negative number');
      }

      if (practicalMarks !== undefined && (!Number.isFinite(practicalMarks) || practicalMarks < 0)) {
        res.status(400);
        throw new Error('Practical marks must be a non-negative number');
      }

      if (examDate && isNaN(Date.parse(examDate))) {
        res.status(400);
        throw new Error('Invalid exam date');
      }

      const totalMarks = (theoryMarks || 0) + (practicalMarks || 0);
      updatedExamResults.push({
        subjectCode,
        subjectName: validSubjects[subjectCode],
        theoryMarks: theoryMarks !== undefined ? theoryMarks : null,
        practicalMarks: practicalMarks !== undefined ? practicalMarks : null,
        totalMarks: totalMarks || null,
        examDate: examDate ? new Date(examDate) : new Date(),
      });
    }

    updateData.examResults = updatedExamResults;
  }

  // Update student
  const updatedStudent = await Registered_Students.findOneAndUpdate(
    query,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-password');

  if (!updatedStudent) {
    res.status(500);
    throw new Error('Failed to update student');
  }

  res.status(200).json({
    success: true,
    message: 'Student details updated successfully',
    data: updatedStudent,
  });
});

// @desc    Add a new exam result manually
// @route   POST /api/students/exam-result
// @access  Public
export const addExamResult = asyncHandler(async (req, res) => {
  const { phoneNumber, rollNo, subjectCode, theoryMarks, practicalMarks, examDate } = req.body;

  const query = buildStudentQuery(phoneNumber, rollNo);

  // Find the student
  const student = await Registered_Students.findOne(query);
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Validate subject code
  const validSubjects = certificationSubjectMap[student.certificationTitle] || {};
  if (!subjectCode || !validSubjects[subjectCode]) {
    res.status(400);
    throw new Error(`Invalid subject code: ${subjectCode} for certification: ${student.certificationTitle}`);
  }

  // Validate marks
  if (theoryMarks !== undefined && (!Number.isFinite(theoryMarks) || theoryMarks < 0)) {
    res.status(400);
    throw new Error('Theory marks must be a non-negative number');
  }

  if (practicalMarks !== undefined && (!Number.isFinite(practicalMarks) || practicalMarks < 0)) {
    res.status(400);
    throw new Error('Practical marks must be a non-negative number');
  }

  if (examDate && isNaN(Date.parse(examDate))) {
    res.status(400);
    throw new Error('Invalid exam date');
  }

  // Calculate total marks
  const totalMarks = (theoryMarks || 0) + (practicalMarks || 0);

  // Add new exam result
  const newResult = {
    subjectCode,
    subjectName: validSubjects[subjectCode],
    theoryMarks: theoryMarks !== undefined ? theoryMarks : null,
    practicalMarks: practicalMarks !== undefined ? practicalMarks : null,
    totalMarks: totalMarks || null,
    examDate: examDate ? new Date(examDate) : new Date(),
  };

  student.examResults.push(newResult);

  // Save updated student
  const updatedStudent = await student.save();

  res.status(200).json({
    success: true,
    message: 'Exam result added successfully',
    data: updatedStudent,
  });
});