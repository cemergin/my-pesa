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

const connectDb = require("./src/utils/connectDb");
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

const handleCreateAccount = async (customerNum, customerName) => {
  try {
    return handleDatabase.createAccount(customerNum, customerName);
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
  try {
    if (amount == null || isNaN(amount)) throw "Amount spesified is invalid";
    const sendAccount = await handleDatabase.getAccount(sendingNum);
    if (sendAccount == null)
      return "There seems to be a problem reaching your account. Please try again later!";
    const receiverAccount = await handleDatabase.getAccount(receiverNum);
    if (receiverAccount == null)
      return "There seems to be a problem reaching the receiver's account. The number you typed may not be a My Pesa Customer. Please try again later'!";
    if (sendAccount.balance < amount) return "Insufficient Funds";
    const transaction = await handleDatabase.transferFunds(
      sendingNum,
      receiverNum,
      amount
    );
    if (transaction != null) {
      const message = await twilioClient.messages.create({
        body: `Transfer of ${amount} $ received from +${transaction.sender.phone}.`,
        from: process.env.TWILIO_FROM,
        to: `+${transaction.receiver.phone}`
      });
    }
    return `${amount}$ successfully sent to user with ${transaction.receiver.phone}`;
  } catch (error) {
    console.log(error);
    return "Failed to transfer funds: " + error.message;
  }
};

const handleWithdraw = async input => {
  return commands.WITHDRAW;
};

const handleDeposit = async input => {
  return commands.DEPOSIT;
};

const handleCreateDepositCode = async amount => {
  try {
    // const admin = await handleDatabase.getAccount(process.env.TWILIO_FROM);
    // if (admin == null) {
    //   admin = await handleDatabase.createAdmin(process.env.TWILIO_FROM, 9999);
    // }
    const code = await handleDatabase.createCode(
      "14127732070",
      amount,
      "deposit"
    );
    return code;
  } catch (error) {
    throw "Error while creating deposit code: " + error.message;
  }
};

// const handleCreateWithdrawCode = async (customerNum, amount) => {
//   try {
//     const account = await handleDatabase.getAccount(customerNum);
//     if (account == null)
//       return "The number you are using is not connected to an account. To create an account, please text 'Create' followed by your full name.";
//     const code = await handleDatabase.createCode(
//       account.phone,
//       amount,
//       "withdraw"
//     );
//     return code.code;
//   } catch (error) {
//     console.log(error.message);
//   }
// };

const handleHelp = async customerNum => {
  const account = handleDatabase.getAccount(customerNum);
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

app.post("/sms", async (req, res) => {
  const smsCount = req.session.counter || 0;

  const from = req.body.From.replace("+", "");
  const body = req.body.Body.toLowerCase().split(" ");

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
