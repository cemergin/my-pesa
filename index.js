const dotenv = require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");

const cryptoRandomString = require("crypto-random-string");

const MessagingResponse = require("twilio").twiml.MessagingResponse;
const twilioClient = require("twilio")(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);
const bodyParser = require("body-parser");

const mongoose = require("mongoose");
const connectDb = require("./src/utils/connectDb");
const accountSchema = require("./src/schema/account");
const transactionSchema = require("./src/schema/code");
const codeSchema = require("./src/schema/code");

const session_secret = cryptoRandomString({ length: 10 });

const app = express();
app.use(express.static(path.join(__dirname, "client/build")));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    secret: session_secret,
    resave: true,
    saveUninitialized: true
  })
);

const connection = {};

connectDb(connection);

const commands = {
  WITHDRAW: "withdraw",
  DEPOSIT: "deposit",
  TRANSFER: "transfer",
  CREATE_ACCOUNT: "create",
  CHECK_BALANCE: "balance",
  TRANSACTIONS: "transactions",
  HELP: "commands"
};

const handleCreateAccount = async (name, number, account) => {
  if (account != null) {
    return "Account already exists. Type 'Help' to see available commands";
  } else {
    if (name == null || name.length == 0) {
      return "Name is invalid. Please try with valid name";
    }
    try {
      const newAccount = await new accountSchema({
        name: name,
        phone: number,
        balance: 0
      }).save();
      console.log({ newAccount });
      return "Account Succesfully Created";
    } catch (error) {
      console.log(error.message);
      return "Error Occured While Creating Account";
    }
  }
};

const handleWithdraw = async input => {
  return commands.WITHDRAW;
};

const handleDeposit = async input => {
  return commands.DEPOSIT;
};

const handleTransfer = async (account, body) => {
  if (account == null || account.phone == null)
    return "There seems to be a problem reaching your account. Please try again later!";
  if (body.length != 3)
    return "Not enough information to complete request. Type 'Transfer' followed by the number you would like to send money and the ammount you would like to send.";
  try {
    const from = account.phone;
    const to = await accountSchema.findOne({ phone: body[1] });
    const amount = parseInt(body[2], 10);
    if (to == null) return "Account you spesified is not a My Pesa customer.";
    if (amount == null || isNaN(amount))
      return "Spesified amount is not a number.";
    if (account.balance < amount) return "Balance Insufficient for transfer";
    let decreaseFrom = await accountSchema.findOneAndUpdate(
      { phone: from },
      { balance: account.balance - amount }
    );
    let increaseTo = await accountSchema.findOneAndUpdate(
      { phone: to.phone },
      { balance: to.balance + amount }
    );
    const message = await twilioClient.messages.create({
      body: `Transfer of ${amount} $ received from +${from}.`,
      from: process.env.TWILIO_FROM,
      to: `+${to.phone}`
    });
    return `${amount}$ successfully sent to user with ${to.phone}`;
  } catch (error) {
    console.log(error.message);
    return "Error Occured While Completing Transfer";
  }
};

const handleCheckBalance = async account => {
  if (account == null)
    return "The number you are using is not connected to an account. To create an account, please text 'Create' followed by your full name.";
  const name = account.name.split(" ")[0];
  const balance = account.balance;
  return `Hi ${name}! Your current balance is ${balance}$`;
};

const handleTransactions = async body => {
  return commands.TRANSACTIONS;
};

const handleHelp = async (body, accountAvailable) => {
  if (!accountAvailable)
    return "The number you are using is not connected to an account. To create an account, please text 'Create' followed by your full name.";
  else {
    let comms = [];
    for (com in commands) comms.push(commands[com]);
    return `Available Commands: ${comms.join(" ")}`;
  }
};

app.post("/sms", async (req, res) => {
  const smsCount = req.session.counter || 0;

  const from = req.body.From.replace("+", "");
  const body = req.body.Body.toLowerCase().split(" ");

  console.log(from);
  console.log(body);

  const twiml = new MessagingResponse();
  let message = "";

  try {
    // Check if account exists
    const account = await accountSchema.findOne({ phone: from });
    if (
      account == null &&
      body[0] != commands.CREATE_ACCOUNT &&
      body[0] != commands.HELP
    ) {
      message =
        "The number you are using is not connected to an account. To create an account, please text 'Create' followed by your full name.";
    } else {
      console.log(account);
      switch (body[0]) {
        case commands.CREATE_ACCOUNT:
          message = await handleCreateAccount(
            body.slice(1).join(" "),
            from,
            account
          );
          break;
        case commands.WITHDRAW:
          message = await handleWithdraw(body);
          break;
        case commands.DEPOSIT:
          message = await handleDeposit(body);
          break;
        case commands.TRANSFER:
          message = await handleTransfer(account, body);
          break;
        case commands.CHECK_BALANCE:
          message = await handleCheckBalance(account);
          break;
        case commands.TRANSFER:
          message = await handleTransactions(account);
          break;
        case commands.HELP:
          message = await handleHelp(body, account != null);
          break;
        default:
          message = "Command Not Found" + (await handleHelp(body));
          break;
      }
    }
  } catch (error) {
    console.log(error);
    message = "Oops! Something went wrong! Error: " + error.message;
  } finally {
    twiml.message(message);
    res.writeHead(200, { "Content-Type": "text/xml" });
    res.end(twiml.toString());
  }

  //   const accountExists = account.phone.some(num =>
  //     ObjectId(productId).equals(doc.product)
  //message = req.body.Body + " " + smsCount;
  //req.session.counter = smsCount + 1;
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "/client/public/index.html"));
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("App listening on port " + listener.address().port);
});
