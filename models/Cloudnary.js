import dotenv from 'dotenv';
import express from 'express';
import fetch from 'node-fetch';

dotenv.config();
const router = express.Router();

const CLOUD_NAME = process.env.CLOUDINARY_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER_NAME = process.env.REACT_APP_CLOUDINARY_FOLDER_GALLERY;

// Route to fetch Cloudinary images
router.get('/cloudinary-images', async (req, res) => {
    try {
        const authString = `${API_KEY}:${API_SECRET}`;
        const base64Auth = Buffer.from(authString).toString('base64');

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image?type=upload&prefix=${FOLDER_NAME}/`,
            {
                headers: {
                    Authorization: `Basic ${base64Auth}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Error fetching images: ${response.statusText}`);
        }

        const data = await response.json();
        const images = data.resources.map(img => img.secure_url);

        res.json({ images });
    } catch (error) {
        console.error('Error fetching Cloudinary images:', error);
        res.status(500).json({ error: 'Failed to fetch images' });
    }
});

export default router;
