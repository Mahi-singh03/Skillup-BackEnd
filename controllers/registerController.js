import Registered_Students from '../models/register.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';

// Configure multer for photo upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 
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
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size must not exceed 50KB' });
        }
        return res.status(400).json({ error: err.message });
      }

      const { emailAddress, password, phoneNumber, aadharNumber, ...rest } = req.body;

      if (!emailAddress || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (!/^\d{10}$/.test(phoneNumber)) {
        return res.status(400).json({ error: 'Invalid phone number format. Must be 10 digits' });
      }

      if (!/^\d{12}$/.test(aadharNumber)) {
        return res.status(400).json({ error: 'Invalid Aadhar number format. Must be 12 digits' });
      }

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

      const newUser = new Registered_Students({
        emailAddress: emailAddress.toLowerCase(),
        password,
        phoneNumber,
        aadharNumber,
        ...rest,
        ...(req.file && {
          photo: req.file.buffer,
          contentType: req.file.mimetype
        })
      });

      await newUser.save();

      const token = jwt.sign(
        { id: newUser._id, email: newUser.emailAddress },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const userResponse = newUser.toJSON();
      if (userResponse.photo) {
        userResponse.photo = {
          contentType: newUser.contentType,
          size: req.file.size,
          message: 'Photo uploaded successfully'
        };
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
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  });
};

export const login = async (req, res) => {
  try {
    const { emailAddress, password } = req.body;

    if (!emailAddress || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await Registered_Students.findOne({ emailAddress: emailAddress.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.emailAddress },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Login successful',
      student: user.toJSON(),
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getStudentByRollNo = async (req, res) => {
  try {
    const { rollNo } = req.params;

    if (!rollNo) {
      return res.status(400).json({ error: 'Roll number is required' });
    }

    const student = await Registered_Students.findOne({ rollNo });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const studentResponse = student.toJSON();
    if (studentResponse.photo) {
      studentResponse.photo = {
        contentType: student.contentType,
        message: 'Photo available'
      };
    }

    res.status(200).json({
      message: 'Student details retrieved successfully',
      student: studentResponse,
    });
  } catch (error) {
    console.error('Get student by roll number error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateStudentPhoto = async (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size must not exceed 50KB' });
        }
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No photo uploaded' });
      }

      const student = await Registered_Students.findById(req.user.id); // Assumes auth middleware
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      student.photo = req.file.buffer;
      student.contentType = req.file.mimetype;
      await student.save();

      res.status(200).json({
        message: 'Photo updated successfully',
        photo: {
          contentType: req.file.mimetype,
          size: req.file.size
        }
      });

    } catch (error) {
      console.error('Photo update error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
};