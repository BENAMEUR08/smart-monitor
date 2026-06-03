const mqtt = require("mqtt");
const SensorLog = require("../models/SensorLog");
const sendAlertEmail = require("../utils/mailer");

let latestSensor = null;
let lastAlertTime = 0;

module.exports = (io) => {
  global.mqttClient = mqtt.connect(process.env.MQTT_URL, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD
  });

  mqttClient.on("connect", () => {
    console.log("✅ Connected to HiveMQ");
    mqttClient.subscribe("esp32/sensors");
  });

  mqttClient.on("message", async (topic, message) => {
    const data = JSON.parse(message.toString());

    latestSensor = data;
    io.emit("sensorData", data);

    // 🔥 ALERT LOGIC (هنا الصحيح)
    try {
      const { temperature, fire } = data;

      if (fire || temperature > 45) {
        const now = Date.now();

        if (now - lastAlertTime > 60000) {
          await sendAlertEmail(
            "🔥 تحذير حريق في المزرعة",
            `⚠️ خطر حريق!

درجة الحرارة: ${temperature}
Fire: ${fire}

يرجى التدخل فورًا.`
          );

          lastAlertTime = now;
        }
      }

    } catch (err) {
      console.error("Alert error:", err);
    }
  });

  // 💾 تخزين البيانات كل 10 ثواني
  setInterval(async () => {
    if (!latestSensor) return;

    try {
      await SensorLog.create({
        fire: latestSensor.fire ?? false,
        temperature: latestSensor.temperature ?? 0,
        humidity: latestSensor.humidity ?? 0,
        fan: latestSensor.fan ?? false,
        heater: latestSensor.heater ?? false,
        water: latestSensor.water ?? false,
        exhaustFan: latestSensor.exhaustFan ?? false,
        tempMin: latestSensor.tempMin ?? 0,
        tempMax: latestSensor.tempMax ?? 0,
        humMax: latestSensor.humMax ?? 0
      });

      console.log("sensor archived");

    } catch (err) {
      console.log(err);
    }
  }, 1000000);
};

// 📡 إتاحة البيانات للـ routes
module.exports.getLatestSensor = () => latestSensor;