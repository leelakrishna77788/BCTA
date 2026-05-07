import dotenv from "dotenv";
import express from "express";
import { v2 as cloudinary } from "cloudinary";
dotenv.config();

const router = express.Router();

cloudinary.config({
  cloud_name: String(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: String(process.env.CLOUDINARY_API_KEY),
  api_secret: String(process.env.CLOUDINARY_API_SECRET),
  secure: true,
});

router.post("/delete-image", async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        error: "publicId is required",
      });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    return res.json(result);
  } catch (error) {
    console.error("Delete error:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;