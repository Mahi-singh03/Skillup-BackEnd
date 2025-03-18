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
router.get('/', async (req, res) => {
  try {
    const { staffId, dob } = req.query;
    
    if (!staffId || !dob) {
      return res.status(400).json({ message: 'StaffID and DOB are required' });
    }

    const staff = await Staff.findOne({
      StaffID: parseInt(staffId),
      DOB: new Date(dob)
    });

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    res.json(staff);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid input format' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;