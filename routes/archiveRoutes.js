const router = require("express").Router();
const SensorLog = require("../models/SensorLog");
const protectPage = require("../middleware/protectPage");

// صفحة الأرشيف
router.get("/archive",protectPage("user"), async (req, res) => {
  const logs = await SensorLog.find().sort({ createdAt: -1 }).limit(500);
  res.render("archive", { logs });
});


// API للرسوم البيانية
router.get("/api/archive",protectPage("user"), async (req, res) => {
  const logs = await SensorLog.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json(logs.reverse());
});

module.exports = router;