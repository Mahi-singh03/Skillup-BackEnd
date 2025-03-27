import asyncHandler from 'express-async-handler';
import Admin from '../models/admin.js';
import jwt from 'jsonwebtoken';

const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const adminExists = await Admin.findOne({ email });
  if (adminExists) {
    res.status(400);
    throw new Error('Admin already exists');
  }

  const admin = await Admin.create({
    name,
    email,
    password,
    role: 'admin'
  });

  if (admin) {
    res.status(201).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id)
    });
  } else {
    res.status(400);
    throw new Error('Invalid admin data');
  }
});

const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email });

  if (admin && (await admin.matchPassword(password))) {
    res.json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id)
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

const getAdminProfile = asyncHandler(async (req, res) => {
  const admin = {
    _id: req.admin._id,
    name: req.admin.name,
    email: req.admin.email,
    role: req.admin.role
  };
  res.json(admin);
});

const getAllAdmins = asyncHandler(async (req, res) => {
  const admins = await Admin.find({}).select('-password');
  res.json(admins);
});

const updateAdmin = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.params.id);

  if (admin) {
    admin.name = req.body.name || admin.name;
    admin.email = req.body.email || admin.email;
    
    if (req.body.password) {
      admin.password = req.body.password;
    }

    const updatedAdmin = await admin.save();
    res.json({
      _id: updatedAdmin._id,
      name: updatedAdmin.name,
      email: updatedAdmin.email,
      role: updatedAdmin.role
    });
  } else {
    res.status(404);
    throw new Error('Admin not found');
  }
});

const deleteAdmin = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.params.id);

  if (admin) {
    await admin.remove();
    res.json({ message: 'Admin removed' });
  } else {
    res.status(404);
    throw new Error('Admin not found');
  }
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

export { 
  registerAdmin, 
  loginAdmin, 
  getAdminProfile,
  getAllAdmins,
  updateAdmin,
  deleteAdmin 
};