
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