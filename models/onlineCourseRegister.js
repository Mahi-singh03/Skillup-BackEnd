import mongoose from 'mongoose';

const onlineCourseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  emailAddress: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
  },
  course: {
    type: String,
    required: [true, 'Course selection is required'],
    enum: [
      "VN Video editing",
    ],
  },
  fatherName: {
    type: String,
    required: [true, "Father's name is required"],
    trim: true,
  },
  userID: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
}, { timestamps: true });

export default mongoose.model('OnlineCourseRegistries', onlineCourseSchema);