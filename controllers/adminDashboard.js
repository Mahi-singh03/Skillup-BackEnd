import asyncHandler from 'express-async-handler';
import Admin from '../models/admin.js';

const getDashboardStats = asyncHandler(async (req, res) => {
  const totalAdmins = await Admin.countDocuments({});
  
  const stats = {
    totalAdmins,
    lastLogin: req.admin.updatedAt,
    adminName: req.admin.name,
    recentAdmins: await Admin.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('-password')
  };

  res.json(stats);
});

export { getDashboardStats };