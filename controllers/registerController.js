import Registered_Students from '../models/register.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';

// Configure multer for photo upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 // 50KB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and JPG files are allowed'));
    }
    cb(null, true);
  }
}).single('photo');

export const register = async (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        console.error('Multer error in register:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size must not exceed 50KB' });
        }
        return res.status(400).json({ error: err.message });
      }

      const { emailAddress, password, phoneNumber, aadharNumber, ...rest } = req.body;

      // Validate required fields
      if (!emailAddress || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Validate phone number (10 digits)
      if (!/^\d{10}$/.test(phoneNumber)) {
        return res.status(400).json({ error: 'Invalid phone number format. Must be 10 digits' });
      }

      // Validate Aadhar number (12 digits)
      if (!/^\d{12}$/.test(aadharNumber)) {
        return res.status(400).json({ error: 'Invalid Aadhar number format. Must be 12 digits' });
      }

      // Check for existing user
      const existingUser = await Registered_Students.findOne({
        $or: [
          { emailAddress: emailAddress.toLowerCase() },
          { aadharNumber },
          { phoneNumber }
        ]
      });

      if (existingUser) {
        const field = existingUser.emailAddress === emailAddress.toLowerCase() ? 'Email' :
                     existingUser.aadharNumber === aadharNumber ? 'Aadhar number' :
                     'Phone number';
        return res.status(409).json({ error: `${field} is already registered` });
      }

      // Log photo data for debugging
      console.log('Photo data:', req.file ? { mimetype: req.file.mimetype, size: req.file.size } : 'No photo uploaded');

      // Create new user
      const newUser = new Registered_Students({
        emailAddress: emailAddress.toLowerCase(),
        password,
        phoneNumber,
        aadharNumber,
        ...rest,
        ...(req.file && req.file.buffer && req.file.mimetype && {
          photo: req.file.buffer,
          contentType: req.file.mimetype
        })
      });

      await newUser.save();

      // Generate JWT token
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not defined');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const token = jwt.sign(
        { id: newUser._id, email: newUser.emailAddress },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Prepare response
      const userResponse = newUser.toJSON();
      if (req.file && userResponse.photo) {
        userResponse.photo = {
          contentType: newUser.contentType,
          size: req.file.size,
          message: 'Photo uploaded successfully'
        };
      } else {
        userResponse.photo = { message: 'No photo uploaded' };
      }

      return res.status(201).json({
        message: 'Registration successful',
        student: userResponse,
        token
      });

    } catch (error) {
      console.error('Registration error:', error);
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ error: messages.join('. ') });
      }
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(409).json({
          error: `${field.charAt(0).toUpperCase() + field.slice(1)} already registered`
        });
      }
      return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  });
};

export const login = async (req, res) => {
  try {
    const { emailAddress, password } = req.body;

    // Validate required fields
    if (!emailAddress || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await Registered_Students.findOne({ emailAddress: emailAddress.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Validate password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.emailAddress },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Prepare response
    const userResponse = user.toJSON();
    userResponse.photo = user.photo ? { message: 'Photo available', contentType: user.contentType } : { message: 'No photo' };

    res.status(200).json({
      message: 'Login successful',
      student: userResponse,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const getStudentByRollNo = async (req, res) => {
  try {
    const { rollNo } = req.params;

    // Validate roll number
    if (!rollNo) {
      return res.status(400).json({ error: 'Roll number is required' });
    }

    // Find student
    const student = await Registered_Students.findOne({ rollNo });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Prepare response
    const studentResponse = student.toJSON();
    studentResponse.photo = student.photo ? { message: 'Photo available', contentType: student.contentType } : { message: 'No photo' };

    res.status(200).json({
      message: 'Student details retrieved successfully',
      student: studentResponse
    });

  } catch (error) {
    console.error('Get student by roll number error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const updateStudentPhoto = async (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        console.error('Multer error in updateStudentPhoto:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size must not exceed 50KB' });
        }
        return res.status(400).json({ error: err.message });
      }

      // Validate file upload
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!req.file.buffer) {
        return res.status(400).json({ error: 'File buffer is missing' });
      }

      if (!req.file.mimetype) {
        return res.status(400).json({ error: 'File type is missing' });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Only JPEG, PNG, and JPG files are allowed' });
      }

      // Validate authenticated user
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized: No user data found' });
      }

      // Find student
      const student = await Registered_Students.findById(req.user.id);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Update photo
      student.photo = req.file.buffer;
      student.contentType = req.file.mimetype;
      
      try {
        await student.save();
        res.status(200).json({
          message: 'Photo updated successfully',
          photo: {
            contentType: req.file.mimetype,
            size: req.file.size
          }
        });
      } catch (saveError) {
        console.error('Error saving student photo:', saveError);
        return res.status(500).json({ 
          error: 'Failed to save photo', 
          details: saveError.message 
        });
      }

    } catch (error) {
      console.error('Photo update error:', error);
      res.status(500).json({ 
        error: 'Internal Server Error', 
        details: error.message 
      });
    }
  });
};