const mongoose = require("mongoose");

const sensorLogSchema = new mongoose.Schema({

 temperature: Number,
  humidity: Number,
  fan: Boolean,
  heater: Boolean,
  fire: Boolean,
  water: Boolean,
  exhaustFan: Boolean,
  tempMin: Number,
  tempMax: Number,
  humMax: Number,

 createdAt:{
   type:Date,
   default:Date.now,
   index:true
 }

});

module.exports=mongoose.model(
"SensorLog",
sensorLogSchema
);