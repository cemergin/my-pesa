const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const MessagingResponse = require("twilio").twiml.MessagingResponse;
const bodyParser = require("body-parser");

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const connection = {};

async function connectDb() {
  if (connection.isConnected) {
    console.log("Using existing connection");
    return;
  }
  const db = await mongoose.connect(process.env.MONGO_SRV, {
    useCreateIndex: true,
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopologyL: true
  });
  console.log("Database Connected");
  connection.isConnected = db.connections[0].readyState;
}

connectDb();

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/sms", (req, res) => {
  const twiml = new MessagingResponse();

  console.log(req.body.Body);
  console.log(req.body.From);

  const msg = twiml.message(req.body.Body);

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/src/views/index.html");
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("App listening on port " + listener.address().port);
});
