import express from 'express';
import OnlineCourseRegistries from '../models/onlineCourseRegister.js';

const router = express.Router();

// Register for a course
router.post('/register', async (req, res) => {
  try {
    const { name, phoneNumber, emailAddress, course, fatherName } = req.body;

    // Check if email already exists
    const existingRegistry = await OnlineCourseRegistries.findOne({ emailAddress });
    if (existingRegistry) {
      return res.status(400).json({ message: 'Email address is already registered' });
    }

    // Create new registration
    const newRegistry = await OnlineCourseRegistries.create({
      name,
      phoneNumber,
      emailAddress,
      course,
      fatherName,
    });

    res.status(201).json(newRegistry);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { userID, password } = req.body;

    // Find user by userID
    const user = await OnlineCourseRegistries.findOne({ userID });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if password matches
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Return success response
    res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;