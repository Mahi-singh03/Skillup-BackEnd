import Registered_Students from '../models/register.js';

export const register = async (req, res) => {
  try {
    const { emailAddress, password, phoneNumber, aadharNumber, ...rest } = req.body;

    // Additional validation
    if (!emailAddress || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate phone number format (10 digits)
    if (!/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format. Must be 10 digits' });
    }

    // Validate Aadhar number format (12 digits)
    if (!/^\d{12}$/.test(aadharNumber)) {
      return res.status(400).json({ error: 'Invalid Aadhar number format. Must be 12 digits' });
    }

    // Check if email already exists
    const existingUser = await Registered_Students.findOne({ 
      $or: [
        { emailAddress: emailAddress.toLowerCase() },
        { aadharNumber },
        { phoneNumber }
      ]
    });

    if (existingUser) {
      if (existingUser.emailAddress === emailAddress.toLowerCase()) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      if (existingUser.aadharNumber === aadharNumber) {
        return res.status(409).json({ error: 'Aadhar number already registered' });
      }
      if (existingUser.phoneNumber === phoneNumber) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }
    }

    // Create a new user
    const newUser = new Registered_Students({
      emailAddress: emailAddress.toLowerCase(),
      password,
      phoneNumber,
      aadharNumber,
      ...rest
    });

    // Save user to DB
    await newUser.save();

    // Send response
    return res.status(201).json({
      message: 'Registration successful',
      student: newUser.toJSON(),
    });

  } catch (error) {
    console.error('Registration error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ error: messages.join('. ') });
    }

    // Handle duplicate key errors (MongoDB error code 11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ 
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} already registered` 
      });
    }

    // Generic error response
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
