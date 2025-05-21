import dotenv from 'dotenv';
import express from 'express';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

router.get('/cloudinary-images', async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: process.env.CLOUDINARY_FOLDER_GALLERY,
      max_results: 50
    });

    const images = result.resources.map(resource => ({
      url: resource.secure_url,
      publicId: resource.public_id
    }));

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.json({ images });
  } catch (error) {
    console.error('Cloudinary API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch images',
      details: error.message
    });
  }
});

export default router;