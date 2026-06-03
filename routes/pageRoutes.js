const router = require("express").Router();
const User = require("../models/User");
const protectPage = require("../middleware/protectPage");


// الصفحة الرئيسية - المستخدم
router.get("/index",protectPage("user"), (req, res) => {
  res.render("index", { user: req.user });
});


// صفحة الأدمن
router.get("/admin", protectPage("admin"), async (req, res) => {
  try {
    const users = await User.find();
    res.render("admin", { user: req.user, users });
  } catch (err) {
    res.status(500).send("حدث خطأ");
  }
});


// الكاميرا
router.get("/camera",(req,res)=>{
res.render(
"camera-sender",
{user:req.user}
);
});


router.get("/view",(req,res)=>{
res.render(
"camera-viewer",
{user:req.user}
);

});

module.exports=router;