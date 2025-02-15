import Registered_Students from '../models/register.js';
import jwt from 'jsonwebtoken';

// Existing register function with improvements
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

        // Check if user exists with improved error messages
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

        // Create and save new user
        const newUser = new Registered_Students({
            emailAddress: emailAddress.toLowerCase(),
            password,
            phoneNumber,
            aadharNumber,
            ...rest
        });

        await newUser.save();

        // Generate JWT token
        const token = jwt.sign(
            { id: newUser._id, email: newUser.emailAddress },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send response with token
        return res.status(201).json({
            message: 'Registration successful',
            student: newUser.toJSON(),
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
};

// Add login functionality
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

// Register student
export const registerStudent = async (req, res) => {
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

        // Check if student exists
        const existingStudent = await Registered_Students.findOne({ 
            $or: [
                { emailAddress: emailAddress.toLowerCase() },
                { aadharNumber },
                { phoneNumber }
            ]
        });

        if (existingStudent) {
            const field = existingStudent.emailAddress === emailAddress.toLowerCase() ? 'Email' :
                         existingStudent.aadharNumber === aadharNumber ? 'Aadhar number' :
                         'Phone number';
            return res.status(409).json({ error: `${field} is already registered` });
        }

        // Create and save new student
        const newStudent = new Registered_Students({
            emailAddress: emailAddress.toLowerCase(),
            password,
            phoneNumber,
            aadharNumber,
            ...rest
        });

        await newStudent.save();

        // Generate JWT token
        const token = jwt.sign(
            { id: newStudent._id, email: newStudent.emailAddress },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send response with token
        return res.status(201).json({
            message: 'Student registration successful',
            student: newStudent.toJSON(),
            token
        });

    } catch (error) {
        console.error('Student registration error:', error);

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
}; 