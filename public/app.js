// ================= SOCKET =================
const socket = io();

// ================= ELEMENTS =================
const menu = document.getElementById("menu");

const temp = document.getElementById("temp");
const hum = document.getElementById("hum");
const fan = document.getElementById("fan");
const heater = document.getElementById("heater");
const fire = document.getElementById("fire");
const water = document.getElementById("water");
const exhaustFan = document.getElementById("exhaustFan");

const alertBox = document.getElementById("alertBox");

// LIMIT INPUTS
const tempMin = document.getElementById("tempMin");
const tempMax = document.getElementById("tempMax");
const humMaxInput = document.getElementById("humMax");
const humMaxDisplay = document.getElementById("humMaxDisplay");
const tempLimits = document.getElementById("tempLimits");

// ================= CHART =================
const chart = new Chart(document.getElementById("chartCanvas"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "Temp", data: [], borderColor: "red" },
      { label: "Hum", data: [], borderColor: "blue" }
    ]
  },
  options: { animation: false }
});

function addChart(t, h) {
  const time = new Date().toLocaleTimeString();

  chart.data.labels.push(time);
  chart.data.datasets[0].data.push(t);
  chart.data.datasets[1].data.push(h);

  if (chart.data.labels.length > 20) {
    chart.data.labels.shift();
    chart.data.datasets.forEach(d => d.data.shift());
  }

  chart.update();
}

// ================= NAVIGATION =================
function openPage(page) {
  menu.style.display = "none";
  document.querySelectorAll(".section").forEach(s => s.style.display = "none");
  document.getElementById(page).style.display = "block";
}

function backHome() {
  document.querySelectorAll(".section").forEach(s => s.style.display = "none");
  menu.style.display = "grid";
}

// ================= ALERT =================
function showAlert(msg) {
  alertBox.style.display = "block";
  alertBox.innerHTML = "🚨 " + msg;
}

function hideAlert() {
  alertBox.style.display = "none";
}

// ================= SOCKET DATA =================
socket.on("sensorData", (data) => {

  console.log("DATA:", data);

  // Sensors
  temp.innerText = data.temperature + " °C";
  hum.innerText = data.humidity + " %";

  // Devices
  fan.innerText = data.fan ? "مشتغل" : "منطفئ";
  heater.innerText = data.heater ? "مشتغل" : "منطفئ";
  water.innerText = data.water ? "مشتغل" : "منطفئ";
  fire.innerText = data.fire ? "🔥" : "لا يوجد";
  exhaustFan.innerText = data.exhaustFan ? "مشتغل" : "منطفئ";

  // Limits
  tempLimits.innerText = `${data.tempMin}°C → ${data.tempMax}°C`;
  humMaxDisplay.innerText = data.humMax + " %";
  // Chart
  addChart(data.temperature, data.humidity);

  // Alerts
  if (data.fire) {
    showAlert("🔥 حريق!");
  } 
  else if (data.temperature > data.tempMax) {
    showAlert("🌡️ حرارة مرتفعة");
  } 
  else if (data.humidity > data.humMax) {
    showAlert("💧 رطوبة مرتفعة");
  } 
  else {
    hideAlert();
  }
});

// ================= SEND LIMITS =================
function sendLimits(){

  const data = {
    tempMin: parseFloat(tempMin.value),
    tempMax: parseFloat(tempMax.value),
    humMax: parseFloat(humMax.value)
  };

  // ❗ تحقق من القيم
  if (isNaN(data.tempMin) || isNaN(data.tempMax) || isNaN(data.humMax)) {
    alert("❌ أدخل جميع القيم");
    return;
  }

  socket.emit("setLimits", data);

  alert("Saved ✅");
}

// ================= LOGOUT =================
async function logout() {
  await fetch("/logout", { method: "POST" });
  location.href = "/";
}

// ================= NAVIGATION EXTRA =================
function goLive() {
  window.location.href = "/view";
}

function goArchive() {
  window.location.href = "/archive";
}

// ================= AI IMAGE =================
async function sendImage() {
  const fileInput = document.getElementById("imageInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("اختر صورة");
    return;
  }

  document.getElementById("preview").src = URL.createObjectURL(file);

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/detect", {
    method: "POST",
    body: formData
  });

  const data = await response.json();

  const statusEl = document.getElementById("healthStatus");
  const confEl = document.getElementById("healthConfidence");

  if (data.status === "no_detection") {
    statusEl.innerText = "❌ لا يوجد مرض";
    statusEl.style.color = "#aaa";
    confEl.innerText = "";
    return;
  }

  statusEl.innerText = "🦠 " + data.disease;
  confEl.innerText = "📊 " + data.confidence + "%";

  if (data.disease.toLowerCase().includes("healthy")) {
    statusEl.style.color = "#22c55e";
  } else {
    statusEl.style.color = "#ef4444";
    alert("🚨 تم اكتشاف مرض: " + data.disease);
  }
}