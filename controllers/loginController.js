import Login from '../models/login.js';
import jwt from 'jsonwebtoken';

// Register admin/user
export const registerUser = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user already exists
        const existingUser = await Login.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Create new user
        const newUser = new Login({
            email: email.toLowerCase(),
            password,
            role: role || 'user'
        });

        await newUser.save();

        // Generate token
        const token = jwt.sign(
            { id: newUser._id, email: newUser.email, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: newUser.toJSON(),
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Register admin
export const registerAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if admin already exists
        const existingAdmin = await Login.findOne({ email: email.toLowerCase(), role: 'admin' });
        if (existingAdmin) {
            return res.status(409).json({ error: 'Admin email already registered' });
        }

        // Create new admin
        const newAdmin = new Login({
            email: email.toLowerCase(),
            password,
            role: 'admin'
        });

        await newAdmin.save();

        // Generate token
        const token = jwt.sign(
            { id: newAdmin._id, email: newAdmin.email, role: newAdmin.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Admin registered successfully',
            admin: newAdmin.toJSON(),
            token
        });

    } catch (error) {
        console.error('Admin registration error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Login user
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await Login.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'Login successful',
            user: user.toJSON(),
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Get user profile
export const getProfile = async (req, res) => {
    try {
        const user = await Login.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ user: user.toJSON() });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}; 