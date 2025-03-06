import express from 'express';
import Staff from '../models/StaffVarification.js'; 

const router = express.Router();

// Staff verification route
router.post('/verify', async (req, res) => {
  const { staffID, dob } = req.body;

  if (!staffID || !dob) {
    return res.status(400).json({ message: 'Staff ID and DOB are required' });
  }

  try {
    const staff = await Staff.findOne({ StaffID: staffID, DOB: dob });

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;