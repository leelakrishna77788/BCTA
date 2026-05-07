import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: String(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: String(process.env.CLOUDINARY_API_KEY),
  api_secret: String(process.env.CLOUDINARY_API_SECRET),
  secure: true,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { publicId } = req.body || {};

    if (!publicId) {
      return res.status(400).json({ error: "publicId is required" });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    return res.json(result);
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ error: error?.message ?? String(error) });
  }
}
