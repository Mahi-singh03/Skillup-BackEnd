import mongoose from 'mongoose';
import Registered_Students from '../models/register.js'; 
import bcrypt from 'bcryptjs';

// Subject mappings
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

// Subject maximum marks
const SUBJECT_DETAILS = {
  "CS-01": { SubjectName: "Basic Computer", MaxTheoryMarks: 100, MaxPracticalMarks: 0 },
  "CS-02": { SubjectName: "Windows Application: MS Office", MaxTheoryMarks: 40, MaxPracticalMarks: 60 },
  "CS-03": { SubjectName: "Operating System", MaxTheoryMarks: 40, MaxPracticalMarks: 60 },
  "CS-04": { SubjectName: "Web Publisher: Internet Browsing", MaxTheoryMarks: 40, MaxPracticalMarks: 60 },
  "CS-05": { SubjectName: "Computer Accountancy: Tally", MaxTheoryMarks: 40, MaxPracticalMarks: 60 },
  "CS-06": { SubjectName: "Desktop Publishing: Photoshop", MaxTheoryMarks: 40, MaxPracticalMarks: 60 },
  "CS-07": { SubjectName: "Computerized Accounting With Tally", MaxTheoryMarks: 40, MaxPracticalMarks: 60 },
  "CS-08": { SubjectName: "Manual Accounting", MaxTheoryMarks: 40, MaxPracticalMarks: 60 },
  "CS-09": { SubjectName: "Tally ERP 9 & Tally Prime", MaxTheoryMarks: 40, MaxPracticalMarks: 60 }
};

// Map certification titles to subject lists
const CERTIFICATION_SUBJECTS = {
  'CERTIFICATION IN COMPUTER APPLICATION': CERTIFICATION_IN_COMPUTER_APPLICATION,
  'DIPLOMA IN COMPUTER APPLICATION': DIPLOMA_IN_COMPUTER_APPLICATION,
  'ADVANCE DIPLOMA IN COMPUTER APPLICATION': ADVANCE_DIPLOMA_IN_COMPUTER_APPLICATION,
  'CERTIFICATION IN COMPUTER ACCOUNTANCY': CERTIFICATION_IN_COMPUTER_ACCOUNTANCY,
  'DIPLOMA IN COMPUTER ACCOUNTANCY': DIPLOMA_IN_COMPUTER_ACCOUNTANCY
};

export const editStudent = async (req, res) => {
  try {
    const { rollNo, phoneNumber, ...updateData } = req.body;

    // Validate input
    if (!rollNo && !phoneNumber) {
      return res.status(400).json({ message: 'Roll number or phone number is required' });
    }

    // Find student
    const query = rollNo ? { rollNo } : { phoneNumber };
    let student = await Registered_Students.findOne(query);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Handle password update
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }

    // Handle fee details update
    if (updateData.feeDetails) {
      const { totalFees, installments, installmentDetails } = updateData.feeDetails;

      if (totalFees && installments) {
        // Generate new installment details if provided
        const amountPerInstallment = Math.floor(totalFees / installments);
        const remainingAmount = totalFees % installments;
        const joining = updateData.joiningDate || student.joiningDate;

        updateData.feeDetails.installmentDetails = Array.from({ length: installments }, (_, index) => {
          const submissionDate = new Date(joining);
          submissionDate.setMonth(joining.getMonth() + index);
          const installmentAmount = index === 0 ? amountPerInstallment + remainingAmount : amountPerInstallment;
          
          return {
            amount: installmentAmount,
            submissionDate,
            paid: false
          };
        });

        updateData.feeDetails.remainingFees = totalFees;
      } else if (installmentDetails) {
        // Update existing installment details
        updateData.feeDetails.installmentDetails = installmentDetails.map(installment => ({
          ...installment,
          submissionDate: new Date(installment.submissionDate),
          paid: installment.paid || false
        }));

        // Recalculate remaining fees
        const paidAmount = installmentDetails
          .filter(i => i.paid)
          .reduce((sum, i) => sum + i.amount, 0);
        updateData.feeDetails.remainingFees = (totalFees || student.feeDetails.totalFees) - paidAmount;
      }
    }

    // Handle exam results update
    if (updateData.examResults) {
      const validSubjects = CERTIFICATION_SUBJECTS[student.certificationTitle] || {};
      
      updateData.examResults = updateData.examResults.map(result => {
        const subjectCode = result.subjectCode;
        const subjectDetails = SUBJECT_DETAILS[subjectCode];

        if (!validSubjects[subjectCode]) {
          throw new Error(`Invalid subject code ${subjectCode} for certification ${student.certificationTitle}`);
        }

        // Validate marks
        const theoryMarks = Number(result.theoryMarks) || 0;
        const practicalMarks = Number(result.practicalMarks) || 0;

        if (theoryMarks > subjectDetails.MaxTheoryMarks || practicalMarks > subjectDetails.MaxPracticalMarks) {
          throw new Error(`Marks exceed maximum for subject ${subjectCode}`);
        }

        return {
          subjectCode,
          subjectName: subjectDetails.SubjectName,
          theoryMarks,
          practicalMarks,
          totalMarks: theoryMarks + practicalMarks,
          examDate: result.examDate ? new Date(result.examDate) : new Date()
        };
      });

      // Calculate final grade based on exam results
      const totalMarks = updateData.examResults.reduce((sum, result) => sum + result.totalMarks, 0);
      const subjectCount = updateData.examResults.length;
      const averageMarks = subjectCount > 0 ? totalMarks / subjectCount : 0;

      if (subjectCount === Object.keys(validSubjects).length) {
        if (averageMarks >= 90) updateData.finalGrade = 'A';
        else if (averageMarks >= 80) updateData.finalGrade = 'B';
        else if (averageMarks >= 70) updateData.finalGrade = 'C';
        else if (averageMarks >= 60) updateData.finalGrade = 'D';
        else updateData.finalGrade = 'F';
      } else {
        updateData.finalGrade = 'Pending';
      }
    }

    // Update student
    student = await Registered_Students.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || 'Error updating student' });
  }
};