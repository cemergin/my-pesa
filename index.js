const dotenv = require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const shortid = require("shortid");

const MessagingResponse = require("twilio").twiml.MessagingResponse;
const twilioClient = require("twilio")(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

const bodyParser = require("body-parser");
const debug = true;

//const connectDb = require("./src/utils/connectDb");
const handleDatabase = require("./src/utils/handleDatabase");
const session_secret = shortid.generate();

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

// const connection = {};
// connectDb(connection);

const commands = {
  WITHDRAW: "withdraw",
  DEPOSIT: "deposit",
  TRANSFER: "transfer",
  CREATE_ACCOUNT: "create",
  CHECK_BALANCE: "balance",
  TRANSACTIONS: "transactions",
  HELP: "commands"
};

const handleCreateAccount = async (customerName, customerNum) => {
  try {
    const newAccount = await handleDatabase.createAccount(
      customerNum,
      customerName
    );
    return `Hi ${customerName}! We have registered your phone to My Pesa`;
  } catch (error) {
    console.log(error);
    return "Failed to Create Account: " + error.message;
  }
};

const handleCheckBalance = async customerNum => {
  try {
    const account = await handleDatabase.getAccount(customerNum);
    if (account == null)
      return "The number you are using is not connected to an account. To create an account, please text 'Create' followed by your full name.";
    const name = account.name.split(" ")[0];
    const balance = account.balance;
    return `Hi ${name}! Your current balance is ${balance}$`;
  } catch (error) {
    console.log(error);
    return "Failed to check balance: " + error.message;
  }
};

const handleTransfer = async (sendingNum, receiverNum, amount) => {
  amount = parseInt(amount, 10);
  try {
    if (amount == null || isNaN(amount)) return "Amount spesified is invalid";
    const sendAccount = await handleDatabase.getAccount(sendingNum);
    console.log("Send Account: " + sendAccount);
    if (sendAccount == null)
      return "There seems to be a problem reaching your account. Please try again later!";
    const receiverAccount = await handleDatabase.getAccount(receiverNum);
    if (receiverAccount == null)
      return "There seems to be a problem reaching the receiver's account. The number you typed may not be a My Pesa Customer. Please try again later'!";
    if (sendAccount.balance < amount) return "Balance insufficient for tranfer";
    const transaction = await handleDatabase.transferFunds(
      sendingNum,
      receiverNum,
      amount
    );
    if (transaction != null) {
      if (!debug) {
        const message = await twilioClient.messages.create({
          body: `Transfer of ${amount} $ received from +${transaction.sender.phone}.`,
          from: process.env.TWILIO_FROM,
          to: `+${transaction.receiver.phone}`
        });
      }
    }
    const phone = transaction.receiver.phone;
    return `${amount}$ successfully sent to user with ${phone}`;
  } catch (error) {
    console.log(error);
    return "Failed to transfer funds: " + error.message;
  }
};

const handleWithdraw = async withdrawCode => {
  try {
    const code = await handleDatabase.getCode(withdrawCode);
    if (code == null || code.type == "deposit" || code.completed == true)
      throw new Error("Invalid withdraw code");
    const newCode = await handleDatabase.consumeCode(
      process.env.TWILIO_FROM,
      withdrawCode,
      "withdraw"
    );
    return true;
  } catch (error) {
    console.log(error.message);
    return false;
  }
};

const handleDeposit = async (phoneNum, depositCode) => {
  try {
    const code = await handleDatabase.getCode(depositCode);
    if (code == null || code.type == "withdraw" || code.completed == true)
      return "The deposit code you shared is invalid.";
    const something = await handleDatabase.consumeCode(
      phoneNum,
      depositCode,
      "deposit"
    );
    const account = await handleDatabase.getAccount(phoneNum);
    return `Deposit code used successfully. New balance is ${account.balance}`;
  } catch (error) {
    console.log(error);
    return "Failed to deposit funds to account: " + error.message;
  }
  return commands.DEPOSIT;
};

const handleCreateDepositCode = async amount => {
  try {
    let admin = await handleDatabase.getAccount(process.env.TWILIO_FROM);
    if (admin == null) {
      admin = await handleDatabase.createAdmin(process.env.TWILIO_FROM, 9999);
    }
    const code = await handleDatabase.createCode(
      admin.phone,
      amount,
      "deposit"
    );
    return code;
  } catch (error) {
    console.log(error);
    return new Error("Unable to create deposit code: " + error.message);
  }
};

const handleCreateWithdrawCode = async (customerNum, amount) => {
  try {
    const account = await handleDatabase.getAccount(customerNum);
    if (account == null)
      return "The number you are using is not connected to an account. To create an account, please text 'Create' followed by your full name.";
    if (account.balance < amount)
      return "Balance infsufficient to create withdraw code";
    const newUser = await handleDatabase.decreaseFunds(account.phone, amount);
    const code = await handleDatabase.createCode(
      account.phone,
      amount,
      "withdraw"
    );
    return `Withdraw Code Generated for the amount of ${amount}$. ${code}`;
  } catch (error) {
    console.log(error.message);
    return "Unable to create withdraw code: " + error.message;
  }
};

const handleHelp = async customerNum => {
  const account = await handleDatabase.getAccount(customerNum);
  console.log("Handle Help:", account);
  if (account == null)
    return "The number you are using is not connected to an account. To create an account, please text 'Create' followed by your full name.";
  else {
    let comms = [];
    for (com in commands) comms.push(commands[com]);
    return `Available Commands: ${comms.join(" ")}`;
  }
};

app.post("/api/createDeposit", async (req, res) => {
  try {
    const amount = parseInt(req.body.amount, 10);
    const code = await handleCreateDepositCode(amount);
    if (code != null) res.status(200).send(code);
    else {
      res.status(400).send("Error while creating Deposit Code");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Error while creating Deposit Code");
  }
});

app.post("/api/handleWithdraw", async (req, res) => {
  try {
    const code = await handleWithdraw(req.body.withdrawCode);
    if (code == true) res.status(200).send(code);
    else {
      res.status(400).send("Error while using Withdraw Code");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Error while creating Withdraw Code");
  }
});

app.post("/sms", async (req, res) => {
  const smsCount = req.session.counter || 0;

  const from = req.body.From.replace("+", "");
  const body = req.body.Body.split(" ");

  console.log(from);
  console.log(body);

  const twiml = new MessagingResponse();
  let message = "";

  try {
    // Check if account exists
    const account = await handleDatabase.getAccount(from);
    if (
      account == null &&
      body[0] != commands.CREATE_ACCOUNT &&
      body[0] != commands.HELP
    ) {
      message =
        "The number you are using is not connected to an account. To create an account, please text 'Create' followed by your full name.";
    } else {
      //console.log(account);
      switch (body[0].toLowerCase()) {
        case commands.CREATE_ACCOUNT:
          message = await handleCreateAccount(body.slice(1).join(" "), from);
          break;
        case commands.WITHDRAW:
          message = await handleCreateWithdrawCode(from, body[1]);
          break;
        case commands.DEPOSIT:
          message = await handleDeposit(from, body[1]);
          break;
        case commands.TRANSFER:
          message = await handleTransfer(from, body[1], body[2]);
          break;
        case commands.CHECK_BALANCE:
          message = await handleCheckBalance(account);
          break;
        case commands.TRANSFER:
          message = await handleTransactions(account);
          break;
        case commands.HELP:
          message = await handleHelp(from);
          break;
        default:
          message = "Command Not Found: " + (await handleHelp(from));
          break;
      }
    }
  } catch (error) {
    console.log(error);
    message = "Oops! Something went wrong! Error: " + error.message;
  } finally {
    if (debug) {
      res.status(200).send(message);
    } else {
      twiml.message(message);
      res.writeHead(200, { "Content-Type": "text/xml" });
      res.end(twiml.toString());
    }
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
