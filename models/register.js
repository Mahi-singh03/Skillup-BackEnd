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
    required: [true, 'Parents phone number is required'],
    trim: true,
    match: [/^[0-9]{10}$/, 'Enter a valid 10-digit parents number phone number'],
  },
  rollNo: {
    type: String,
    unique: true,
    index: true,
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
    match: [/^[0-9]{10}$/, 'Enter a valid 10-digit phone number'],
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of Birth is required'],
  },
  joiningDate: {
    type: Date,
    required: [true, 'Joining date is required'],
    default: Date.now,
  },
  farewellDate: {
    type: Date,
  },
  aadharNumber: {
    type: String,
    required: [true, 'Aadhar Number is required'],
    unique: true,
    match: [/^[0-9]{12}$/, 'Enter a valid 12-digit Aadhar number'],
    index: true,
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
    select: false,
  },
  certificate: {
    type: Boolean,
    default: false,
  },
  feeDetails: {
    totalFees: {
      type: Number,
      required: false,
      min: 0
    },
    remainingFees: {
      type: Number,
      required: false,
      min: 0
    },
    installments: {
      type: Number,
      required: false,
      min: 1,
      max: 12
    },
    installmentDetails: [{
      amount: {
        type: Number,
        required: false,
        min: 0
      },
      submissionDate: {
        type: Date,
        required: false
      },
      paid: {
        type: Boolean,
        default: false
      }
    }]
  },
  examResults: [{
    subjectCode: {
      type: String,

    },
    subjectName: {
      type: String,
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
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate certification title and calculate farewell date before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('selectedCourse') || this.isModified('courseDuration') || this.isModified('joiningDate')) {
    // Set certification title
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

    // Calculate farewell date based on course duration
    const joining = new Date(this.joiningDate);
    let monthsToAdd = 0;
    switch (this.courseDuration) {
      case '3 months':
        monthsToAdd = 3;
        break;
      case '6 months':
        monthsToAdd = 6;
        break;
      case '1 year':
        monthsToAdd = 12;
        break;
    }
    this.farewellDate = new Date(joining.setMonth(joining.getMonth() + monthsToAdd));
  }
  next();
});

// Generate installment details before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('feeDetails') || this.isModified('joiningDate')) {
    const { totalFees, installments, installmentDetails } = this.feeDetails;
    
    // Only generate installment details if they haven't been manually set
    if (!installmentDetails || installmentDetails.length === 0) {
      const amountPerInstallment = Math.floor(totalFees / installments);
      const remainingAmount = totalFees % installments;
      const joining = new Date(this.joiningDate);
      
      this.feeDetails.installmentDetails = Array.from({ length: installments }, (_, index) => {
        const submissionDate = new Date(joining);
        submissionDate.setMonth(joining.getMonth() + index);
        
        // Distribute remaining amount to first installment
        const installmentAmount = index === 0 ? amountPerInstallment + remainingAmount : amountPerInstallment;
        
        return {
          amount: installmentAmount,
          submissionDate,
          paid: false
        };
      });
      
      // Set initial remaining fees
      this.feeDetails.remainingFees = totalFees;
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

// Add password comparison method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Create indexes for frequently queried fields
userSchema.index({ emailAddress: 1 });
userSchema.index({ aadharNumber: 1 });
userSchema.index({ rollNo: 1 });

export default mongoose.model('Registered_Students', userSchema);