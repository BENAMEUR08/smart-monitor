const router = require("express").Router();
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const protectPage = require("../middleware/protectPage");
const upload = multer({ dest: "uploads/" });

// كشف الأمراض في الصور
router.post("/detect",protectPage("user"), upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const imagePath = req.file.path;
    const image = fs.readFileSync(imagePath, { encoding: "base64" });

    const response = await axios({
      method: "POST",
      url: "https://serverless.roboflow.com/chicken-disease-dataset-fecal-2/1",
      params: { api_key: process.env.ROBOFLOW_API_KEY },
      data: image,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    const result = response.data;
    console.log(result);
    fs.unlinkSync(imagePath);

    const prediction = result?.predictions?.[0];

    if (!prediction) {
      return res.json({ status: "no_detection", message: "لم يتم اكتشاف شيء" });
    }

    res.json({
      status: "success",
      disease: prediction.class,
      confidence: (prediction.confidence * 100).toFixed(2),
      box: {
        x: prediction.x,
        y: prediction.y,
        width: prediction.width,
        height: prediction.height
      }
    });
  } catch (err) {
    console.error("AI Error:", err.message);
    res.status(500).json({ error: "AI processing failed" });
  }
});

module.exports = router;