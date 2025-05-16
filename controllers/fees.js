import Registered_Students from '../models/register.js';
import asyncHandler from 'express-async-handler';

// @desc    Get student details by phone number or roll number with enhanced search
// @route   GET /api/fees/student
// @access  Public
export const getStudentDetails = asyncHandler(async (req, res) => {
  const { phoneNumber, rollNo, email, aadharNumber } = req.query;

  if (!phoneNumber && !rollNo && !email && !aadharNumber) {
    res.status(400);
    throw new Error('Please provide at least one search parameter: phone number, roll number, email, or Aadhar number');
  }

  const query = {};
  if (phoneNumber) query.phoneNumber = phoneNumber;
  if (rollNo) query.rollNo = rollNo;
  if (email) query.emailAddress = email.toLowerCase();
  if (aadharNumber) query.aadharNumber = aadharNumber;

  const student = await Registered_Students.findOne(query).select(
    'fullName fatherName selectedCourse courseDuration feeDetails rollNo phoneNumber emailAddress joiningDate farewellDate'
  );

  if (!student) {
    res.status(404);
    throw new Error('Student not found. Please check your search parameters.');
  }

  // Calculate course progress
  const now = new Date();
  const totalDuration = student.farewellDate - student.joiningDate;
  const elapsedDuration = now - student.joiningDate;
  const progressPercentage = Math.min(100, Math.max(0, Math.round((elapsedDuration / totalDuration) * 100))) || 0;

  // Format fee details for better readability
  const formattedFeeDetails = {
    ...student.feeDetails.toObject(),
    installmentDetails: student.feeDetails.installmentDetails.map((installment, index) => ({
      ...installment.toObject(),
      submissionDate: installment.submissionDate.toLocaleDateString(),
      status: installment.paid ? 'Paid' : 
             new Date(installment.submissionDate) < now ? 'Overdue' : 'Pending',
      installmentNumber: index + 1
    }))
  };

  res.status(200).json({
    success: true,
    data: {
      studentInfo: {
        fullName: student.fullName,
        fatherName: student.fatherName,
        rollNo: student.rollNo,
        phoneNumber: student.phoneNumber,
        email: student.emailAddress,
        selectedCourse: student.selectedCourse,
        courseDuration: student.courseDuration,
        courseProgress: `${progressPercentage}%`,
        joiningDate: student.joiningDate.toLocaleDateString(),
        farewellDate: student.farewellDate.toLocaleDateString()
      },
      feeDetails: formattedFeeDetails,
      summary: {
        totalFees: student.feeDetails.totalFees,
        paidFees: student.feeDetails.totalFees - student.feeDetails.remainingFees,
        remainingFees: student.feeDetails.remainingFees,
        paymentStatus: student.feeDetails.remainingFees === 0 ? 'Fully Paid' : 
                       student.feeDetails.remainingFees === student.feeDetails.totalFees ? 'Not Paid' : 'Partially Paid'
      }
    },
  });
});

// @desc    Get all students' fees with advanced filtering and sorting
// @route   GET /api/fees/all
// @access  Public
export const getAllStudentFees = asyncHandler(async (req, res) => {
  const { 
    incompleteOnly, 
    course, 
    duration, 
    sortBy, 
    sortOrder = 'asc',
    search,
    paymentStatus 
  } = req.query;
  
  let query = {};
  
  // Search filter
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { rollNo: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Course filter
  if (course) {
    query.selectedCourse = course;
  }
  
  // Duration filter
  if (duration) {
    query.courseDuration = duration;
  }
  
  // Payment status filters
  if (paymentStatus) {
    switch (paymentStatus.toLowerCase()) {
      case 'paid':
        query['feeDetails.remainingFees'] = 0;
        break;
      case 'unpaid':
        query['feeDetails.remainingFees'] = { $eq: query.feeDetails?.totalFees || { $gt: 0 } };
        break;
      case 'partial':
        query['feeDetails.remainingFees'] = { 
          $gt: 0, 
          $lt: query.feeDetails?.totalFees || Infinity 
        };
        break;
    }
  } else if (incompleteOnly === 'true') {
    query['feeDetails.remainingFees'] = { $gt: 0 };
  }

  // Determine sort field and order
  let sortOption = {};
  if (sortBy) {
    const order = sortOrder.toLowerCase() === 'desc' ? -1 : 1;
    switch (sortBy.toLowerCase()) {
      case 'name':
        sortOption = { fullName: order };
        break;
      case 'rollno':
        sortOption = { rollNo: order };
        break;
      case 'course':
        sortOption = { selectedCourse: order };
        break;
      case 'remaining':
        sortOption = { 'feeDetails.remainingFees': order };
        break;
      case 'joindate':
        sortOption = { joiningDate: order };
        break;
      default:
        sortOption = { fullName: 1 }; // Default sort by name ascending
    }
  }

  const students = await Registered_Students.find(query)
    .sort(sortOption)
    .select(
      'fullName rollNo phoneNumber emailAddress selectedCourse courseDuration joiningDate farewellDate feeDetails'
    );

  const formattedStudents = students.map(student => {
    const now = new Date();
    const totalDuration = student.farewellDate - student.joiningDate;
    const elapsedDuration = now - student.joiningDate;
    const progressPercentage = Math.min(100, Math.max(0, Math.round((elapsedDuration / totalDuration) * 100))) || 0;

    return {
      id: student._id,
      fullName: student.fullName,
      rollNo: student.rollNo,
      phoneNumber: student.phoneNumber,
      email: student.emailAddress,
      selectedCourse: student.selectedCourse,
      courseDuration: student.courseDuration,
      courseProgress: `${progressPercentage}%`,
      joiningDate: student.joiningDate.toLocaleDateString(),
      feeSummary: {
        totalFees: student.feeDetails.totalFees,
        paid: student.feeDetails.totalFees - student.feeDetails.remainingFees,
        remaining: student.feeDetails.remainingFees,
        status: student.feeDetails.remainingFees === 0 ? 'Fully Paid' : 
                student.feeDetails.remainingFees === student.feeDetails.totalFees ? 'Not Paid' : 'Partially Paid',
        overdueInstallments: student.feeDetails.installmentDetails.filter(
          inst => !inst.paid && new Date(inst.submissionDate) < now
        ).length
      }
    };
  });

  // Add summary statistics
  const summary = {
    totalStudents: formattedStudents.length,
    totalFees: formattedStudents.reduce((sum, student) => sum + student.feeSummary.totalFees, 0),
    totalPaid: formattedStudents.reduce((sum, student) => sum + student.feeSummary.paid, 0),
    totalRemaining: formattedStudents.reduce((sum, student) => sum + student.feeSummary.remaining, 0),
    fullyPaid: formattedStudents.filter(student => student.feeSummary.status === 'Fully Paid').length,
    partiallyPaid: formattedStudents.filter(student => student.feeSummary.status === 'Partially Paid').length,
    notPaid: formattedStudents.filter(student => student.feeSummary.status === 'Not Paid').length
  };

  res.status(200).json({
    success: true,
    count: formattedStudents.length,
    summary,
    data: formattedStudents,
  });
});

// @desc    Update student fees with enhanced validation and flexibility
// @route   PUT /api/fees/update
// @access  Public
export const updateStudentFees = asyncHandler(async (req, res) => {
  const { 
    phoneNumber, 
    rollNo, 
    email,
    aadharNumber,
    totalFees, 
    paidAmount, 
    installmentIndex,
    newInstallments,
    markInstallmentPaid,
    customPayment,
    paymentDate,
    notes
  } = req.body;

  if (!phoneNumber && !rollNo && !email && !aadharNumber) {
    res.status(400);
    throw new Error('Please provide at least one identifier: phone number, roll number, email, or Aadhar number');
  }

  if (totalFees === undefined && paidAmount === undefined && 
      installmentIndex === undefined && newInstallments === undefined &&
      markInstallmentPaid === undefined && customPayment === undefined) {
    res.status(400);
    throw new Error('Please provide at least one update parameter');
  }

  // Validate numerical inputs
  if (totalFees !== undefined && (isNaN(totalFees) || totalFees < 0)) {
    res.status(400);
    throw new Error('Total fees must be a positive number');
  }

  if (paidAmount !== undefined && (isNaN(paidAmount) || paidAmount < 0)) {
    res.status(400);
    throw new Error('Paid amount must be a positive number');
  }

  if (newInstallments !== undefined && 
      (isNaN(newInstallments) || newInstallments < 1 || newInstallments > 12)) {
    res.status(400);
    throw new Error('Installments must be a number between 1 and 12');
  }

  if (customPayment !== undefined && 
      (isNaN(customPayment.amount) || customPayment.amount < 0)) {
    res.status(400);
    throw new Error('Custom payment amount must be a positive number');
  }

  const query = {};
  if (phoneNumber) query.phoneNumber = phoneNumber;
  if (rollNo) query.rollNo = rollNo;
  if (email) query.emailAddress = email.toLowerCase();
  if (aadharNumber) query.aadharNumber = aadharNumber;

  const student = await Registered_Students.findOne(query);
  if (!student) {
    res.status(404);
    throw new Error('Student not found. Please check your search parameters.');
  }

  // Keep track of changes for audit log
  const changes = [];
  const originalFeeDetails = JSON.parse(JSON.stringify(student.feeDetails));

  // Update totalFees if provided
  if (totalFees !== undefined && totalFees !== student.feeDetails.totalFees) {
    changes.push(`Total fees changed from ${student.feeDetails.totalFees} to ${totalFees}`);
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
        paid: existingInstallment.paid || false,
        paymentDate: existingInstallment.paymentDate,
        notes: existingInstallment.notes
      };
    });
  }

  // Update number of installments if provided
  if (newInstallments !== undefined && newInstallments !== student.feeDetails.installments) {
    changes.push(`Installments changed from ${student.feeDetails.installments} to ${newInstallments}`);
    student.feeDetails.installments = newInstallments;
    
    // Recreate installment schedule
    const amountPerInstallment = Math.floor(student.feeDetails.totalFees / newInstallments);
    const remainingAmount = student.feeDetails.totalFees % newInstallments;
    
    student.feeDetails.installmentDetails = Array.from({ length: newInstallments }, (_, index) => {
      // Try to preserve existing payment status if possible
      const existingInstallment = student.feeDetails.installmentDetails[index] || {};
      const submissionDate = new Date(student.joiningDate);
      submissionDate.setMonth(submissionDate.getMonth() + index);
      
      return {
        amount: index === 0 ? amountPerInstallment + remainingAmount : amountPerInstallment,
        submissionDate,
        paid: existingInstallment.paid || false,
        paymentDate: existingInstallment.paymentDate,
        notes: existingInstallment.notes
      };
    });
  }

  // Mark specific installment as paid if requested
  if (markInstallmentPaid !== undefined) {
    if (markInstallmentPaid < 0 || markInstallmentPaid >= student.feeDetails.installmentDetails.length) {
      res.status(400);
      throw new Error(`Invalid installment index. Must be between 0 and ${student.feeDetails.installmentDetails.length - 1}`);
    }

    const installment = student.feeDetails.installmentDetails[markInstallmentPaid];
    if (!installment.paid) {
      changes.push(`Marked installment ${markInstallmentPaid + 1} as paid (${installment.amount})`);
      installment.paid = true;
      installment.paymentDate = paymentDate || new Date();
      if (notes) installment.notes = notes;
    }
  }

  // Process partial payment to a specific installment
  if (paidAmount !== undefined && installmentIndex !== undefined) {
    if (installmentIndex < 0 || installmentIndex >= student.feeDetails.installmentDetails.length) {
      res.status(400);
      throw new Error(`Invalid installment index. Must be between 0 and ${student.feeDetails.installmentDetails.length - 1}`);
    }

    const installment = student.feeDetails.installmentDetails[installmentIndex];
    const alreadyPaid = installment.paid ? installment.amount : 0;
    
    if (paidAmount > installment.amount) {
      res.status(400);
      throw new Error(`Paid amount (${paidAmount}) cannot exceed installment amount (${installment.amount})`);
    }

    if (paidAmount === installment.amount) {
      changes.push(`Fully paid installment ${installmentIndex + 1} (${installment.amount})`);
      installment.paid = true;
      installment.paymentDate = paymentDate || new Date();
      if (notes) installment.notes = notes;
    } else {
      changes.push(`Partially paid ${paidAmount} towards installment ${installmentIndex + 1}`);
      // For partial payments, we need to adjust the installment structure
      // Create a new installment for the remaining amount
      const remainingAmount = installment.amount - paidAmount;
      
      // Update current installment
      installment.amount = paidAmount;
      installment.paid = true;
      installment.paymentDate = paymentDate || new Date();
      if (notes) installment.notes = notes;
      
      // Insert new installment for remaining amount
      const newSubmissionDate = new Date(installment.submissionDate);
      newSubmissionDate.setMonth(newSubmissionDate.getMonth() + 1);
      
      student.feeDetails.installmentDetails.splice(installmentIndex + 1, 0, {
        amount: remainingAmount,
        submissionDate: newSubmissionDate,
        paid: false
      });
      
      // Update total installments count
      student.feeDetails.installments = student.feeDetails.installmentDetails.length;
    }
  }

  // Process custom payment (not tied to specific installment)
  if (customPayment !== undefined) {
    const paymentAmount = customPayment.amount;
    if (paymentAmount <= 0) {
      res.status(400);
      throw new Error('Payment amount must be positive');
    }

    changes.push(`Recorded custom payment of ${paymentAmount}`);

    // Apply payment to earliest unpaid installments first
    let remainingPayment = paymentAmount;
    const unpaidInstallments = student.feeDetails.installmentDetails
      .map((inst, idx) => ({ ...inst.toObject(), index: idx }))
      .filter(inst => !inst.paid || inst.amount > (inst.paidAmount || 0))
      .sort((a, b) => a.submissionDate - b.submissionDate);

    for (const inst of unpaidInstallments) {
      if (remainingPayment <= 0) break;

      const outstanding = inst.amount - (inst.paidAmount || 0);
      const paymentApplied = Math.min(outstanding, remainingPayment);

      const installment = student.feeDetails.installmentDetails[inst.index];
      
      if (paymentApplied === outstanding) {
        installment.paid = true;
      } else {
        // For partial payment, track the paid amount
        installment.paidAmount = (installment.paidAmount || 0) + paymentApplied;
      }
      
      installment.paymentDate = paymentDate || new Date();
      if (notes) installment.notes = notes;
      
      remainingPayment -= paymentApplied;
    }

    // If there's remaining payment after covering all installments, treat as advance
    if (remainingPayment > 0) {
      changes.push(`Remaining ${remainingPayment} recorded as advance payment`);
      student.feeDetails.advancePayment = (student.feeDetails.advancePayment || 0) + remainingPayment;
    }
  }

  // Recalculate remaining fees considering all changes
  const totalPaid = student.feeDetails.installmentDetails.reduce((sum, installment) => {
    return installment.paid ? sum + installment.amount : sum + (installment.paidAmount || 0);
  }, student.feeDetails.advancePayment || 0);

  student.feeDetails.remainingFees = Math.max(0, student.feeDetails.totalFees - totalPaid);

  // Add audit log entry
  if (changes.length > 0) {
    if (!student.feeDetails.auditLog) {
      student.feeDetails.auditLog = [];
    }
    student.feeDetails.auditLog.push({
      date: new Date(),
      changes: changes.join(', '),
      updatedBy: req.user?.id || 'system',
      previousState: originalFeeDetails
    });
  }

  await student.save();

  // Format response with detailed information
  const formattedInstallments = student.feeDetails.installmentDetails.map((inst, idx) => ({
    installmentNumber: idx + 1,
    amount: inst.amount,
    dueDate: inst.submissionDate.toLocaleDateString(),
    status: inst.paid ? 'Paid' : 
           (inst.paidAmount ? `Partially Paid (${inst.paidAmount}/${inst.amount})` : 
           (new Date(inst.submissionDate) < new Date() ? 'Overdue' : 'Pending')),
    paymentDate: inst.paymentDate?.toLocaleDateString() || '',
    notes: inst.notes || ''
  }));

  res.status(200).json({
    success: true,
    message: changes.length > 0 ? 'Fees updated successfully' : 'No changes made',
    changes: changes.length > 0 ? changes : undefined,
    data: {
      studentInfo: {
        fullName: student.fullName,
        rollNo: student.rollNo,
        course: `${student.selectedCourse} (${student.courseDuration})`
      },
      feeSummary: {
        totalFees: student.feeDetails.totalFees,
        totalPaid: totalPaid,
        remainingFees: student.feeDetails.remainingFees,
        paymentStatus: student.feeDetails.remainingFees === 0 ? 'Fully Paid' : 
                      totalPaid === 0 ? 'Not Paid' : 'Partially Paid',
        advancePayment: student.feeDetails.advancePayment || 0
      },
      installments: formattedInstallments
    },
  });
});

// @desc    Get fee payment history for a student
// @route   GET /api/fees/history
// @access  Public
export const getFeeHistory = asyncHandler(async (req, res) => {
  const { phoneNumber, rollNo, email, aadharNumber } = req.query;

  if (!phoneNumber && !rollNo && !email && !aadharNumber) {
    res.status(400);
    throw new Error('Please provide at least one identifier: phone number, roll number, email, or Aadhar number');
  }

  const query = {};
  if (phoneNumber) query.phoneNumber = phoneNumber;
  if (rollNo) query.rollNo = rollNo;
  if (email) query.emailAddress = email.toLowerCase();
  if (aadharNumber) query.aadharNumber = aadharNumber;

  const student = await Registered_Students.findOne(query).select(
    'fullName rollNo phoneNumber feeDetails'
  );

  if (!student) {
    res.status(404);
    throw new Error('Student not found. Please check your search parameters.');
  }

  // Extract payment history from installments and audit log
  const paymentHistory = [];
  
  // Add payments from installments
  student.feeDetails.installmentDetails.forEach((inst, index) => {
    if (inst.paid || inst.paidAmount) {
      paymentHistory.push({
        date: inst.paymentDate || inst.submissionDate,
        amount: inst.paid ? inst.amount : inst.paidAmount,
        type: 'installment',
        installmentNumber: index + 1,
        notes: inst.notes || ''
      });
    }
  });
  
  // Add advance payments if any
  if (student.feeDetails.advancePayment) {
    paymentHistory.push({
      date: new Date(),
      amount: student.feeDetails.advancePayment,
      type: 'advance',
      notes: 'Advance payment'
    });
  }
  
  // Add entries from audit log
  if (student.feeDetails.auditLog) {
    student.feeDetails.auditLog.forEach(log => {
      paymentHistory.push({
        date: log.date,
        amount: 0, // Audit entries don't represent payments
        type: 'audit',
        description: log.changes,
        updatedBy: log.updatedBy
      });
    });
  }
  
  // Sort by date descending
  paymentHistory.sort((a, b) => b.date - a.date);

  res.status(200).json({
    success: true,
    data: {
      studentInfo: {
        fullName: student.fullName,
        rollNo: student.rollNo,
        phoneNumber: student.phoneNumber
      },
      paymentHistory: paymentHistory.map(payment => ({
        ...payment,
        date: payment.date.toLocaleDateString(),
        amount: payment.amount || undefined
      })),
      summary: {
        totalPaid: student.feeDetails.totalFees - student.feeDetails.remainingFees,
        remainingFees: student.feeDetails.remainingFees,
        lastPayment: paymentHistory.length > 0 ? 
          paymentHistory[0].date.toLocaleDateString() : 'No payments yet'
      }
    }
  });
});