const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true }, // البريد الإلكتروني
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" }
});

// تشفير كلمة المرور قبل الحفظ
UserSchema.pre("save", async function(){
  if(this.isModified("password")){
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// مقارنة كلمة المرور عند تسجيل الدخول
UserSchema.methods.comparePassword = async function(password){
  return await bcrypt.compare(password, this.password);
}

module.exports = mongoose.model("User", UserSchema);