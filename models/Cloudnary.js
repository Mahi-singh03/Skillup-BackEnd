import dotenv from 'dotenv';
import express from 'express';

dotenv.config();
const router = express.Router();

const CLOUD_NAME = process.env.CLOUDINARY_NAME;
const FOLDER_NAME = process.env.REACT_APP_CLOUDINARY_FOLDER_GALLERY;

// Route to fetch Cloudinary images
router.get('/cloudinary-images', async (req, res) => {
    try {
        const response = await fetch(
            `https://res.cloudinary.com/${CLOUD_NAME}/image/list/${FOLDER_NAME}.json`
        );

        if (!response.ok) {
            throw new Error(`Error fetching images: ${response.statusText}`);
        }

        const data = await response.json();
        const images = data.resources.map(img => 
            `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${img.public_id}.${img.format}`
        );

        res.json({ images });
    } catch (error) {
        console.error('Error fetching Cloudinary images:', error);
        res.status(500).json({ error: 'Failed to fetch images' });
    }
});

export default router;
