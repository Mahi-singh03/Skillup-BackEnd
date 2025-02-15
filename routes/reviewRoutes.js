import express from 'express';
import Review from '../models/reviews.js';

const router = express.Router();

// Create a new review
router.post('/', async (req, res) => {
  try {
    const { name, comment, rating } = req.body;
    
    // Validate required fields first
    if (!name || !comment || !rating) {
      return res.status(400).json({ 
        message: 'All fields are required',
        details: {
          name: name ? undefined : 'Name is required',
          comment: comment ? undefined : 'Comment is required',
          rating: rating ? undefined : 'Rating is required'
        }
      });
    }

    // Convert rating to number and validate
    const numericRating = Number(rating);
    
    if (isNaN(numericRating)) {
      return res.status(400).json({ message: 'Rating must be a valid number' });
    }

    if (numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Validate string inputs
    if (typeof name !== 'string' || typeof comment !== 'string') {
      return res.status(400).json({ message: 'Name and comment must be text' });
    }

    const newReview = new Review({
      name: name.trim(),
      comment: comment.trim(),
      rating: numericRating // Use the converted numeric rating
    });

    const savedReview = await newReview.save();
    res.status(201).json(savedReview);
  } catch (error) {
    console.error('Review creation error:', error);
    res.status(500).json({ 
      message: 'Error creating review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all reviews
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ date: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ 
      message: 'Error fetching reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ Ensure only ONE export default
export default router;
