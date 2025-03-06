import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  Name: String,
  StaffID: String,
  JoinningData: String,
  Designation: String,
  DOB: String,
  LeavingDate: String,
  FatherName: String,
  MotherName: String,
  Address: String,
});

const Staff = mongoose.model('Staff', staffSchema);

export default Staff;