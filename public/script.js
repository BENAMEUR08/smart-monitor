
// ----- إعداد Socket.io -----
const socket = io();

// عناصر HTML
const temp = document.getElementById("temp");
const hum = document.getElementById("hum");
const lux = document.getElementById("lux");
const fan = document.getElementById("fan");
const heater = document.getElementById("heater");
const fire = document.getElementById("fire");
const water = document.getElementById("water");

const tempLimits = document.getElementById("tempLimits");
const humLimits = document.getElementById("humLimits");
const luxLimits = document.getElementById("luxLimits");

const tempMin = document.getElementById("tempMin");
const tempMax = document.getElementById("tempMax");
const humMin = document.getElementById("humMin");
const humMax = document.getElementById("humMax");
const luxMin = document.getElementById("luxMin");
const luxMax = document.getElementById("luxMax");

const alertBox = document.getElementById("alertBox");

// ----- Chart.js -----
const chart = new Chart(document.getElementById("chart"),{
  type:"line",
  data:{
    labels:[],
    datasets:[
      { label:"Temp", data:[], borderColor:"red" },
      { label:"Hum", data:[], borderColor:"blue" },
      { label:"Lux", data:[], borderColor:"orange" }
    ]
  },
  options:{ animation:false }
});

function addChart(tempValue,humValue,luxValue){
  const time = new Date().toLocaleTimeString();
  chart.data.labels.push(time);
  chart.data.datasets[0].data.push(tempValue);
  chart.data.datasets[1].data.push(humValue);
  chart.data.datasets[2].data.push(luxValue);

  if(chart.data.labels.length>20){
    chart.data.labels.shift();
    chart.data.datasets.forEach(d=>d.data.shift());
  }
  chart.update();
}

// ----- التنبيهات -----
function showAlert(text){ alertBox.innerHTML=text; alertBox.style.display="block"; }
function hideAlert(){ alertBox.style.display="none"; }

// ----- استقبال البيانات الحية -----
socket.on("sensorData", (data)=>{
  temp.innerHTML = data.temperature + " °C";
  hum.innerHTML = data.humidity + " %";
  lux.innerHTML = data.lux + " Lux";

  fan.innerHTML = data.fan ? "🌀 تعمل" : "متوقفة";
  heater.innerHTML = data.heater ? "🔥 يعمل" : "متوقف";
  fire.innerHTML = data.fire ? "🔥 مشتعلة" : "🟢 آمن";
  fire.className = data.fire ? "fire-on" : "fire-off";
  water.innerHTML = data.water ? "💦 تعمل" : "متوقفة";
  water.className = data.water ? "water-on" : "water-off";

  addChart(data.temperature,data.humidity,data.lux);

  // تنبيهات
  if(data.fire) showAlert("🚨 حريق!");
  else if(data.temperature>data.tempMax) showAlert("🔥 حرارة مرتفعة");
  else if(data.temperature<data.tempMin) showAlert("❄ حرارة منخفضة");
  else if(data.humidity>data.humMax) showAlert("💧 رطوبة مرتفعة");
  else hideAlert();

  // عرض الحدود
  tempLimits.innerHTML = data.tempMin+"°C → "+data.tempMax+"°C";
  humLimits.innerHTML = data.humMin+"% → "+data.humMax+"%";
  luxLimits.innerHTML = data.luxMin+" → "+data.luxMax+" Lux";

  // تحديث الحقول فقط إذا لم يكن المستخدم يعدلها
  if(!editing){
    tempMin.value = data.tempMin;
    tempMax.value = data.tempMax;
    humMin.value = data.humMin;
    humMax.value = data.humMax;
    luxMin.value = data.luxMin;
    luxMax.value = data.luxMax;
  }
});

// ----- التحكم في الإدخال -----
let editing = false;
document.querySelectorAll("input").forEach(input=>{
  input.addEventListener("focus",()=>editing=true);
  input.addEventListener("blur",()=>editing=false);
});

// ----- إرسال الحدود الجديدة -----
function sendLimits(){
  const limits = {
    tempMin:parseFloat(tempMin.value),
    tempMax:parseFloat(tempMax.value),
    humMin:parseFloat(humMin.value),
    humMax:parseFloat(humMax.value),
    luxMin:parseFloat(luxMin.value),
    luxMax:parseFloat(luxMax.value)
  };
  socket.emit("setLimits", limits);
  alert("✅ تم إرسال الحدود");
}

async function logout(){
  try{
    const res = await fetch("/logout", {
      method: "POST"
    });

    if(res.ok){
      window.location.href = "/";
    }else{
      alert("خطأ في تسجيل الخروج");
    }
  }catch(err){
    console.error(err);
    alert("فشل الاتصال بالسيرفر");
  }
}

// ============================
// 🎥 WebRTC LIVE STREAM
// ============================

let pc = null;
let liveStarted = false;

const remoteVideo = document.getElementById("remoteVideo");
const liveStatus = document.getElementById("liveStatus");
const videoOverlay = document.getElementById("videoOverlay");
// تشغيل البث
function startLive(){

  if(liveStarted) return;
  liveStarted = true;

  console.log("▶ بدء البث");

  remoteVideo.style.display = "block";

  // 🔒 حماية من الخطأ
  try {
    if(typeof liveStatus !== "undefined" && liveStatus){
      liveStatus.innerHTML = "● مباشر";
      liveStatus.classList.add("live-on");
    }

    if(typeof videoOverlay !== "undefined" && videoOverlay){
      videoOverlay.style.display = "none";
    }
  } catch(e){
    console.warn("⚠️ مشكلة في عناصر الواجهة:", e);
  }

  // إنشاء الاتصال
  pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ]
  });

  // استقبال الفيديو
  pc.ontrack = (event) => {
    console.log("📡 تم استقبال الفيديو");

    remoteVideo.srcObject = event.streams[0];

    remoteVideo.play().then(()=>{
      console.log("✅ الفيديو يعمل");
    }).catch(err=>{
      console.log("⚠️ autoplay مشكلة:", err);
    });
  };

  // إرسال ICE
  pc.onicecandidate = (event) => {
    if(event.candidate){
      socket.emit("ice-candidate", event.candidate);
    }
  };

  // 🔥 مهم جداً
  socket.emit("viewer-joined");
}


// استقبال offer من السيرفر
socket.on("offer", async (offer) => {

  if(!pc){
    console.log("⚠️ تجاهل offer (لم يتم تشغيل البث)");
    return;
  }
  console.log("📩 offer وصل");
  try{
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", pc.localDescription);
  }catch(err){
    console.error("❌ خطأ offer:", err);
  }
});


// استقبال ICE من السيرفر
socket.on("ice-candidate", async (candidate) => {

  if(!pc){
    console.log("⚠️ ICE قبل التشغيل");
    return;
  }

  try{
    await pc.addIceCandidate(candidate);
  }catch(e){
    console.error("❌ ICE error:", e);
  }
});


// إيقاف البث
function stopLive(){

  console.log("⛔ إيقاف البث");

  // إغلاق الاتصال
  if(pc){
    pc.close();
    pc = null;
  }

  // إيقاف الفيديو
  if(remoteVideo){
    remoteVideo.srcObject = null;
    remoteVideo.style.display = "none";
  }

  // تحديث الحالة (بشكل آمن)
  try{
    if(typeof liveStatus !== "undefined" && liveStatus){
      liveStatus.innerHTML = "● غير متصل";
      liveStatus.classList.remove("live-on");
    }

    if(typeof videoOverlay !== "undefined" && videoOverlay){
      videoOverlay.style.display = "flex";
    }
  }catch(e){
    console.warn("⚠️ مشكلة في عناصر الواجهة:", e);
  }

  liveStarted = false;
}