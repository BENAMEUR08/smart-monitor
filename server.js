// app.js
require("dotenv").config(); // تحميل المتغيرات من .env

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const path = require("path");
const cookieParser = require("cookie-parser");
const User = require("./models/User");
const mqtt = require("mqtt");
const { Server } = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ---- متغيرات من .env ----
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// ---- اتصال MongoDB ----
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ---- Middleware ----
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// منع الكاش للصفحات
app.use((req,res,next)=>{
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

// ---- Middleware لحماية الصفحات ----
function protectPage(role){
  return (req,res,next)=>{
    const token = req.cookies.token;
    if(!token) return res.redirect("/");
    try{
      const payload = jwt.verify(token, JWT_SECRET);
      if(role && payload.role !== role) return res.status(403).send("🚫 Forbidden");
      req.user = payload;
      next();
    } catch(e){
      return res.redirect("/");
    }
  }
}

// ---- Routes ----

// صفحة المستخدم العادي
app.get("/index", protectPage("user"), (req,res)=>{
  res.render("index", { user: req.user }); 
});

// صفحة الإدارة
app.get("/admin", protectPage("admin"), async (req, res) => {
  try {
    const users = await User.find(); // جلب جميع المستخدمين
    res.render("admin", { user: req.user, users });
  } catch (err) {
    res.status(500).send("حدث خطأ");
  }
});

// ---- Live Camera Streaming ----

// صفحة صاحب المزرعة
app.get("/camera", (req,res)=>{
  res.render("camera-sender", { user: req.user }); // تمرير معلومات المستخدم إذا أردت
});

// صفحة المشاهدة
app.get("/view",protectPage("user"), (req,res)=>{
  res.render("camera-viewer", { user: req.user });
});
// ---- WebRTC Signaling ----

// صفحة تسجيل الدخول
app.get("/", (req,res)=>{
  res.render("login");
});

// ---- Auth Routes ----

// تسجيل الدخول
app.post("/login", async (req,res)=>{
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if(!user) return res.status(401).json({ error: "Invalid credentials" });
  const match = await user.comparePassword(password);
  if(!match) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ _id:user._id, username:user.username, role:user.role }, JWT_SECRET, { expiresIn:"8h" });
  res.cookie("token", token, { httpOnly:true, sameSite:"strict" });
  res.json({ role: user.role });
});

// تسجيل الخروج
app.post("/logout", (req,res)=>{
  res.clearCookie("token", { httpOnly:true, sameSite:"strict" });
  res.json({ message: "Logged out" });
});

// ---- إدارة المستخدمين ----

// إنشاء مستخدم جديد
app.post("/create-user", protectPage("admin"), async (req,res)=>{
  const { username, password, role } = req.body;
  try{
    const newUser = new User({ username,password,role });
    await newUser.save();
    res.json({ message:"User created" });
  } catch(err){
    res.status(400).json({ error: err.message });
  }
});

// حذف مستخدم
app.delete("/delete-user/:id", protectPage("admin"), async (req, res) => {
  try {
    const userId = req.params.id;

    // منع المدير من حذف نفسه
    if (req.user._id === userId) {
      return res.status(400).json({ error: "🚫 لا يمكنك حذف نفسك" });
    }

    await User.findByIdAndDelete(userId);
    res.json({ message: "تم الحذف بنجاح" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// تعديل مستخدم (تغيير الدور)
app.put("/edit-user/:id", protectPage("admin"), async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    // التحقق من صحة الدور
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "🚫 دور غير صحيح" });
    }

    // منع المدير من تعديل دوره الخاص بنفسه
    if (req.user._id === userId) {
      return res.status(400).json({ error: "🚫 لا يمكنك تعديل دورك" });
    }

    await User.findByIdAndUpdate(userId, { role });
    res.json({ message: "تم التعديل بنجاح" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- MQTT ----
const mqttClient = mqtt.connect(process.env.MQTT_URL, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD
});

mqttClient.on("connect", () => {
  console.log("✅ Connected to HiveMQ");
  mqttClient.subscribe("esp32/sensors");
});

mqttClient.on("message", (topic,message)=>{
  const data = JSON.parse(message.toString());
  io.emit("sensorData", data); // إرسال البيانات لجميع المتصفحات المتصلة
});

// ---- Socket.io ----
io.on("connection", socket => {

  // WebRTC Signaling
  socket.on("viewer-joined", () => {socket.broadcast.emit("viewer-joined");});
  socket.on("offer", (offer) => { socket.broadcast.emit("offer", offer); });
  socket.on("answer", (answer) => { socket.broadcast.emit("answer", answer); });
  socket.on("ice-candidate", (candidate) => { socket.broadcast.emit("ice-candidate", candidate); });

  // MQTT / Limits
  socket.on("setLimits", (limits)=> {
    mqttClient.publish("esp32/limits", JSON.stringify(limits));
    console.log("Limits sent:", limits);
  });
});

// ---- تشغيل السيرفر ----
server.listen(PORT, ()=>console.log(`Server running on http://localhost:${PORT}`));