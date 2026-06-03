require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cookieParser = require("cookie-parser");
const http = require("http");
require("./config/db");
const app = express();
const server = http.createServer(app);
const io = require("./sockets/socket")(server);
require("./config/mqtt")(io);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(cookieParser());

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));

app.use(
 express.static(
 path.join(__dirname,"public")
 )
);


// منع الكاش
app.use((req,res,next)=>{
res.setHeader(
"Cache-Control",
"no-store, no-cache, must-revalidate, private"
);
next();
});


// Routes
app.use("/",require("./routes/authRoutes"));
app.use("/",require("./routes/pageRoutes"));
app.use("/",require("./routes/adminRoutes"));
app.use("/",require("./routes/aiRoutes"));
app.use("/",require("./routes/archiveRoutes"));


const PORT=process.env.PORT ||3000;

server.listen(PORT,()=>{
console.log(`Server running on http://localhost:${PORT}`);
});