import { errorResponse } from '../utils/responseHandler.js';

export const validateRegistration = (req, res, next) => {
  const { emailAddress, password, phoneNumber, aadharNumber } = req.body;

  if (!emailAddress || !password) {
    return errorResponse(res, 'Email and password are required', 400);
  }

  if (!/^\d{10}$/.test(phoneNumber)) {
    return errorResponse(res, 'Invalid phone number format', 400);
  }

  if (!/^\d{12}$/.test(aadharNumber)) {
    return errorResponse(res, 'Invalid Aadhar number format', 400);
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorResponse(res, 'Email and password are required', 400);
  }

  next();
}; 