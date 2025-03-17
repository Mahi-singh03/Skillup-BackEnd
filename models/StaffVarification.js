import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  Name: String,
  StaffID: Number,
  JoinningData: Date,
  Designation: String,
  DOB: Date,
  LeavingDate: Date,
  FatherName: String,
  MotherName: String,
  Address: String,
});

const Staff = mongoose.model('Staff', staffSchema);

export default Staff;