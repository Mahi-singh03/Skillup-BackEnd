import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  photo: {
    public_id: {
      type: String,
      default: null
    },
    url: {
      type: String,
      default: null
    }
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: {
      values: ['male', 'female', 'other'],
      message: 'Gender must be either male, female, or other',
    },
    lowercase: true,
    trim: true,
  },
  fatherName: {
    type: String,
    required: [true, "Father's name is required"],
    trim: true,
  },
  motherName: {
    type: String,
    required: [true, "Mother's name is required"],
    trim: true,
  },
  parentsPhoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  rollNo: {
    type: String,
    unique: true,
  },
  emailAddress: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of Birth is required'],
  },
  aadharNumber: {
    type: String,
    required: [true, 'Aadhar Number is required'],
    unique: true,
    match: [/^[0-9]{12}$/, 'Enter a valid 12-digit Aadhar number'],
  },
  selectedCourse: {
    type: String,
    required: [true, 'Course selection is required'],
    enum: ['HTML, CSS, JS', 'React', 'MERN FullStack', 'Autocad', 'CorelDRAW', 'Tally', 'Premier Pro', 'WordPress', 'Computer Course', 'MS Office', 'PTE'],
  },
  courseDuration: {
    type: String,
    required: [true, 'Course duration is required'],
    enum: ['3 months', '6 months', '1 year'],
  },
  certificationTitle: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
  },
  qualification: {
    type: String,
    required: [true, 'Qualification is required'],
    enum: ['10th', '12th', 'Graduated'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
  },
  certificate: {
    type: Boolean,
    required: false,
    default: false,
  },
  joiningDate: {
    type: Date,
    required: [true, 'Joining date is required'],
  },
  farewellDate: {
    type: Date,
    required: [true, 'Farewell date is required'],
  },
  fees: [{
    total: {
      type: Number,
      required: true,
      min: 0
    },
    paid: {
      type: Number,
      required: true,
      min: 0
    },
    unpaid: {
      type: Number,
      required: true,
      min: 0
    },
    installments: [{
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      date: {
        type: Date,
        required: true,
        default: Date.now
      }
    }]
  }],
  examResults: [{
    subjectCode: {
      type: String,
      required: true,
    },
    subjectName: {
      type: String,
      required: true,
    },
    theoryMarks: {
      type: Number,
      default: null,
    },
    practicalMarks: {
      type: Number,
      default: null,
    },
    totalMarks: {
      type: Number,
      default: null,
    },
    examDate: {
      type: Date,
      default: Date.now,
    },
  }],
  finalGrade: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'F', 'Pending'],
    default: 'Pending',
  },
}, { timestamps: true });

// Calculate farewellDate based on joiningDate and courseDuration
userSchema.pre('save', async function (next) {
  if (this.isModified('joiningDate') || this.isModified('courseDuration') || !this.farewellDate) {
    const joiningDate = this.joiningDate;
    if (!joiningDate) {
      return next(new Error('Joining date is required to calculate farewell date'));
    }

    const durationMap = {
      '3 months': 3,
      '6 months': 6,
      '1 year': 12,
    };

    const monthsToAdd = durationMap[this.courseDuration];
    if (!monthsToAdd) {
      return next(new Error('Invalid course duration'));
    }

    const farewellDate = new Date(joiningDate);
    farewellDate.setMonth(farewellDate.getMonth() + monthsToAdd);
    this.farewellDate = farewellDate;
  }
  next();
});

// Generate certification title before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('selectedCourse') || this.isModified('courseDuration')) {
    if (this.selectedCourse === 'Computer Course') {
      switch (this.courseDuration) {
        case '3 months':
          this.certificationTitle = 'CERTIFICATION IN COMPUTER APPLICATION';
          break;
        case '6 months':
          this.certificationTitle = 'DIPLOMA IN COMPUTER APPLICATION';
          break;
        case '1 year':
          this.certificationTitle = 'ADVANCE DIPLOMA IN COMPUTER APPLICATION';
          break;
        default:
          this.certificationTitle = this.selectedCourse;
      }
    } else if (this.selectedCourse === 'Tally') {
      switch (this.courseDuration) {
        case '3 months':
          this.certificationTitle = 'CERTIFICATION IN COMPUTER ACCOUNTANCY';
          break;
        case '6 months':
          this.certificationTitle = 'DIPLOMA IN COMPUTER ACCOUNTANCY';
          break;
        default:
          this.certificationTitle = this.selectedCourse;
      }
    } else {
      this.certificationTitle = this.selectedCourse;
    }
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Auto-generate Roll Number before saving
userSchema.pre('save', async function (next) {
  if (this.rollNo) return next();

  const currentYear = new Date().getFullYear();
  const lastUser = await mongoose.model('Registered_Students').findOne().sort({ rollNo: -1 });

  let newRollNo;
  if (lastUser && lastUser.rollNo && lastUser.rollNo.startsWith(currentYear.toString())) {
    const lastRollNumber = parseInt(lastUser.rollNo.slice(4), 10);
    newRollNo = `${currentYear}${String(lastRollNumber + 1).padStart(3, '0')}`;
  } else {
    newRollNo = `${currentYear}001`;
  }

  this.rollNo = newRollNo;
  next();
});

// Transform photo Buffer to base64 data URL and remove sensitive fields
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

// Add password comparison method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('Registered_Students', userSchema);