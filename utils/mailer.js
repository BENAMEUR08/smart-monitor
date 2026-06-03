const nodemailer = require("nodemailer");

// 🔐 إعداد الإيميل (Gmail مثال)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 📧 دالة إرسال التنبيه
const sendAlertEmail = async (subject, message) => {
  try {
    const mailOptions = {
      from: `"Smart Farm System 🚜" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO, // بريد صاحب المزرعة
      subject: subject,
      text: message
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("📧 Email sent:", info.response);
    return true;

  } catch (error) {
    console.error("❌ Email error:", error);
    return false;
  }
};

module.exports = sendAlertEmail;