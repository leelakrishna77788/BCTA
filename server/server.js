import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import deleteImageRoute from "./delete-image.js";

dotenv.config();

console.log("ENV CHECK");
console.log("CLOUD NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API KEY:", process.env.CLOUDINARY_API_KEY);
console.log("API SECRET:", process.env.CLOUDINARY_API_SECRET);

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", deleteImageRoute);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});