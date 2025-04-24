import Registered_Students from '../models/register.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// JWT Middleware
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ error: 'Not authorized, no token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Not authorized, token invalid' });
  }
};

// Multer Config
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit (increased from 50KB)
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and JPG files are allowed'));
    }
    cb(null, true);
  }
}).single('photo');

// Helper function to upload photo to Cloudinary
const uploadToCloudinary = async (fileBuffer, mimetype, rollNo) => {
  const b64 = Buffer.from(fileBuffer).toString("base64");
  const dataURI = "data:" + mimetype + ";base64," + b64;
  
  return await cloudinary.uploader.upload(dataURI, {
    folder: 'StudentProfilePhoto',
    public_id: `student_${rollNo}_${Date.now()}`,
    transformation: [
      { width: 500, height: 500, crop: 'fill', gravity: 'face' }, // Changed to 'fill' crop
      { quality: 'auto:best' }
    ]
  });
};

// Register a new student
const register = async (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        console.error('Multer error in register:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size must not exceed 2MB' });
        }
        return res.status(400).json({ error: err.message });
      }

      const { emailAddress, password, phoneNumber, aadharNumber, rollNo, ...rest } = req.body;

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

      let photoData = null;
      if (req.file) {
        const cloudinaryResponse = await uploadToCloudinary(
          req.file.buffer,
          req.file.mimetype,
          rollNo || 'new' // Use 'new' if rollNo not provided yet
        );
        photoData = {
          public_id: cloudinaryResponse.public_id,
          url: cloudinaryResponse.secure_url
        };
      }

      // Create new user
      const newUser = new Registered_Students({
        emailAddress: emailAddress.toLowerCase(),
        password,
        phoneNumber,
        aadharNumber,
        ...rest,
        ...(photoData && { photo: photoData })
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
      userResponse.photo = photoData 
        ? { url: photoData.url, message: 'Photo uploaded successfully' }
        : { message: 'No photo uploaded' };

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

// Login student
const login = async (req, res) => {
  try {
    const { emailAddress, password } = req.body;

    if (!emailAddress || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await Registered_Students.findOne({ emailAddress: emailAddress.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

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

    res.status(200).json({
      message: 'Login successful',
      student: {
        ...userResponse,
        photo: user.photo 
          ? { url: user.photo.url, message: 'Photo available' }
          : { message: 'No photo available' }
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

// Get student by roll number
const getStudentByRollNo = async (req, res) => {
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

    res.status(200).json({
      message: 'Student details retrieved successfully',
      student: {
        ...studentResponse,
        photo: student.photo 
          ? { url: student.photo.url, message: 'Photo available' }
          : { message: 'No photo available' }
      }
    });

  } catch (error) {
    console.error('Get student by roll number error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

// Update student photo
const updateStudentPhoto = async (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size must not exceed 2MB' });
        }
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No photo uploaded' });
      }

      const { rollNo } = req.body;
      if (!rollNo) {
        return res.status(400).json({ error: 'Roll number is required' });
      }

      const student = await Registered_Students.findOne({ rollNo });
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Delete old photo from Cloudinary if exists
      if (student.photo?.public_id) {
        try {
          await cloudinary.uploader.destroy(student.photo.public_id);
        } catch (cloudinaryErr) {
          console.error('Error deleting old photo:', cloudinaryErr);
        }
      }

      // Upload new photo to Cloudinary
      const cloudinaryResponse = await uploadToCloudinary(
        req.file.buffer,
        req.file.mimetype,
        rollNo
      );

      // Update student record
      student.photo = {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url
      };

      await student.save();

      return res.status(200).json({
        message: 'Photo updated successfully',
        photo: {
          url: cloudinaryResponse.secure_url,
          size: req.file.size,
        },
      });
    } catch (error) {
      console.error('Photo update error:', error);
      return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  });
};

export { register, login, getStudentByRollNo, updateStudentPhoto, protect };