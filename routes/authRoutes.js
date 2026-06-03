const router = require("express").Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const protectPage = require("../middleware/protectPage");
// صفحة تسجيل الدخول
router.get("/", (req, res) => {
  res.render("login");
});

// تسجيل الدخول
router.post("/login", async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: "يرجى إدخال جميع الحقول" });
  }

  const user = await User.findOne({
    $or: [
      { username: usernameOrEmail },
      { email: usernameOrEmail }
    ]
  });

  if (!user) {
    return res.status(401).json({ error: "بيانات تسجيل غير صحيحة" });
  }

  const match = await user.comparePassword(password);
  if (!match) {
    return res.status(401).json({ error: "بيانات تسجيل غير صحيحة" });
  }

  const token = jwt.sign(
    { _id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.cookie("token", token, { httpOnly: true, sameSite: "strict" });
  res.json({ role: user.role });
});

// تسجيل الخروج
router.post("/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "strict" });
  res.json({ message: "Logged out" });
});

module.exports = router;