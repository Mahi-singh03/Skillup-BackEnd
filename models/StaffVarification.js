import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  Name: String,
  StaffID: { type: Number, required: true, unique: true },
  JoinningData: Date,
  Designation: String,
  DOB: { type: Date, required: true },
  LeavingDate: Date,
  FatherName: String,
  MotherName: String,
  Address: String,
});

const Staff = mongoose.model('Staff', staffSchema);

export default Staff;