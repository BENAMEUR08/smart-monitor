const router = require("express").Router();
const User = require("../models/User");
const protectPage = require("../middleware/protectPage");

// إنشاء مستخدم جديد
router.post("/create-user", protectPage("admin"), async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: "يرجى ملء جميع الحقول" });
  }

  try {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "البريد مستخدم" });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: "اسم المستخدم مستخدم" });
    }

    const newUser = new User({ username, email, password, role });
    await newUser.save();

    res.json({ message: "تم إنشاء المستخدم" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// حذف مستخدم
router.delete("/delete-user/:id", protectPage("admin"), async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.user._id === userId) {
      return res.status(400).json({ error: "🚫 لا يمكنك حذف نفسك" });
    }

    await User.findByIdAndDelete(userId);
    res.json({ message: "تم الحذف" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// تعديل مستخدم
router.put("/edit-user/:id", protectPage("admin"), async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email, role } = req.body;

    // المستخدم المراد تعديله
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }

    // منع تعديل نفسك (اختياري لكن مهم)
    if (req.user._id.toString() === userId) {
      return res.status(400).json({ error: "لا يمكنك تعديل حسابك من هنا" });
    }

    // تحقق من role
    if (role && !["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "دور غير صحيح" });
    }

    // تحقق من email (ما يكون مكرر)
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
      }
    }

    // تحديث البيانات (فقط إذا تم إرسالها)
    user.username = username || user.username;
    user.email = email || user.email;
    user.role = role || user.role;

    await user.save();

    res.json({ message: "تم التعديل بنجاح" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;