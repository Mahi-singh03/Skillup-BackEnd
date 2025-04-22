import Login from '../models/login.js';
import jwt from 'jsonwebtoken';

// Register admin/user
export const registerUser = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const photo = req.file;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const existingUser = await Login.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Create new user with proper photo structure
        const newUser = new Login({
            email: email.toLowerCase(),
            password,
            role: role || 'user',
            photo: photo ? {
                data: photo.buffer,
                contentType: photo.mimetype
            } : null
        });

        await newUser.save();

        const token = jwt.sign(
            { id: newUser._id, email: newUser.email, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Convert to JSON to trigger the schema transform
        const userResponse = newUser.toJSON();

        res.status(201).json({
            message: 'User registered successfully',
            user: userResponse,
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Login user (updated to ensure consistent photo response)
export const loginUser = async (req, res) => {
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
  
      // Include photo details in the response
      const photoResponse = user.photo
        ? {
            message: 'Photo available',
            contentType: user.photo.contentType,
            url: userResponse.photo.url 
          }
        : { message: 'No photo' };
  
      res.status(200).json({
        message: 'Login successful',
        student: {
          ...userResponse,
          photo: photoResponse // Include the photo response with url
        },
        token
      });
  
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  };
// Get user profile (simplified)
export const getProfile = async (req, res) => {
    try {
        const user = await Login.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Convert to JSON to trigger the schema transform
        const userResponse = user.toJSON();

        res.status(200).json({ user: userResponse });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Update profile picture (fixed to use proper structure)
export const updateProfilePicture = async (req, res) => {
    try {
        const user = await Login.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        user.photo = {
            data: req.file.buffer,
            contentType: req.file.mimetype
        };

        await user.save();

        // Convert to JSON to trigger the schema transform
        const userResponse = user.toJSON();

        res.status(200).json({
            message: 'Profile picture updated successfully',
            user: userResponse
        });

    } catch (error) {
        console.error('Profile picture update error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};