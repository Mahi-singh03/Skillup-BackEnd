import express from 'express';
import Staff from '../models/StaffVarification.js';

const router = express.Router();

// Create Staff
router.post('/', async (req, res) => {
  try {
    const newStaff = new Staff(req.body);
    await newStaff.save();
    res.status(201).json(newStaff);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'StaffID already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Staff by ID and DOB
router.get('/verify', async (req, res) => {
  try {
    const { staffID, dob } = req.query;
    
    // Validate required fields
    if (!staffID || !dob) {
      return res.status(400).json({ 
        message: 'Both Staff ID and Date of Birth are required' 
      });
    }

    // Convert to numbers/dates with validation
    const numericStaffID = parseInt(staffID, 10);
    if (isNaN(numericStaffID)) {
      return res.status(400).json({ 
        message: 'Invalid Staff ID format' 
      });
    }

    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) {
      return res.status(400).json({ 
        message: 'Invalid Date of Birth format' 
      });
    }

    // Find staff member with date range for DOB
    const staff = await Staff.findOne({
      StaffID: numericStaffID,
      DOB: {
        $gte: new Date(dobDate.setHours(0, 0, 0, 0)),
        $lte: new Date(dobDate.setHours(23, 59, 59, 999))
      }
    }).select('-__v -_id'); // Exclude unnecessary fields

    if (!staff) {
      return res.status(404).json({ 
        message: 'No staff member found with these credentials' 
      });
    }

    // Convert Mongoose document to plain object and format response
    const staffData = staff.toObject({ virtuals: true });
    staffData.id = staffData._id;
    delete staffData._id;

    res.json(staffData);

  } catch (error) {
    console.error('Verification error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid data format' 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error during verification' 
    });
  }
});

export default router;