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

// Verify Staff by StaffID and DOB
router.get('/verify', async (req, res) => {
  try {
    const { staffId, dob } = req.query;

    if (!staffId || !dob) {
      return res.status(400).json({ message: 'StaffID and DOB are required' });
    }

    const staffIdNum = parseInt(staffId, 10);
    if (isNaN(staffIdNum)) {
      return res.status(400).json({ message: 'Invalid StaffID format' });
    }

    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) {
      return res.status(400).json({ message: 'Invalid DOB format' });
    }

    const staff = await Staff.findOne({
      StaffID: staffIdNum,
      DOB: dobDate
    }).lean();

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Remove MongoDB internal fields
    const { _id, __v, ...staffData } = staff;
    
    res.json(staffData);

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;