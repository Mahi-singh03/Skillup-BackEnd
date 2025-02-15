import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true
  },
  comment: { 
    type: String, 
    required: [true, 'Comment is required'],
    trim: true
  },
  rating: { 
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating must not exceed 5']
  },
  date: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.models.Review || mongoose.model('Review', reviewSchema);
