const mongoose = require("mongoose");

async function connectDb(connection) {
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
  console.log("DB Connected");
  connection.isConnected = db.connections[0].readyState;
}

module.exports = connectDb;
