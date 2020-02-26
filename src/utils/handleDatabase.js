// MongoDB Dependencies
const mongoose = require("mongoose");
const accountSchema = require("../schema/account");
const transactionSchema = require("../schema//code");
const codeSchema = require("../schema//code");
const shortid = require("shortid");
const connectDb = require("./connectDb");

// Server Connection
const connection = {};
connectDb(connection);

const handleDatabase = {
  getAccount: async customerNum => {
    try {
      return await accountSchema.findOne({ phone: customerNum });
    } catch (error) {
      console.log(error);
      throw new Error(
        "Failed to retreive account information: " + error.message
      );
    }
  },
  createAccount: async (customerNum, customerName) => {
    try {
      const customerAccount = await handleDatabase.getAccount(customerNum);
      if (customerAccount != null) throw new Error("Account Already Exists");
      if (customerName == null) throw new Error("Name is null");
      const newAccount = await new accountSchema({
        name: customerName,
        phone: customerNum,
        balance: 0
      }).save();
      return newAccount;
    } catch (error) {
      console.log(error);
      throw new Error("Failed to create account: " + error.message);
    }
  },
  createAdmin: async (AdminNum, balance) => {
    try {
      const AdminAccount = await handleDatabase.getAccount(AdminNum);
      if (AdminAccount != null) throw new Error("Admin Account Already Exists");
      const newAccount = await new accountSchema({
        name: "ADMIN",
        phone: AdminNum,
        balance: balance,
        type: "admin"
      }).save();
      return newAccount;
    } catch (error) {
      console.log(error);
      throw new Error("Failed to create admin account:" + error.message);
    }
  },
  increaseFunds: async (customerNum, amount) => {
    try {
      const account = await handleDatabase.getAccount(customerNum);
      if (account == null) throw new Error("Sending Account Does Not Exist");
      if (amount == null || isNaN(amount)) throw new Error("Invalid Amount");
      const newAccount = await accountSchema.findOneAndUpdate(
        { phone: account.phone },
        { balance: account.balance + amount },
        { new: true }
      );
      return newAccount;
    } catch (error) {
      console.log(error);
      throw new Error("Failed to increase funds:" + error.message);
    }
  },
  decreaseFunds: async (customerNum, amount) => {
    try {
      const account = await handleDatabase.getAccount(customerNum);
      if (account == null) throw "Receiving Account Does Not Exist";
      if (amount == null || isNaN(amount)) throw "Invalid Amount";
      if (account.balance < amount) throw "Insufficient Balance";
      const newAccount = await accountSchema.findOneAndUpdate(
        { phone: account.phone },
        { balance: account.balance - amount },
        { new: true }
      );
      return newAccount;
    } catch (error) {
      console.log(error);
      throw new Error("Failed to decrease funds:" + error.message);
    }
  },
  transferFunds: async (sendingNum, receiverNum, amount) => {
    try {
      const sender = await handleDatabase.decreaseFunds(sendingNum, amount);
      const receiver = await handleDatabase.increaseFunds(receiverNum, amount);
      const log = await handleDatabase.logTransaction(
        sender,
        receiver,
        amount,
        "transfer"
      );
      return { sender, receiver };
    } catch (error) {
      console.log(error.message);
      throw new Error("Failed to Complete Transfer" + error.message);
    }
  },
  logTransaction: async (sender, receiver, amount, type) => {
    try {
      if (sender == null || receiver == null || amount == null)
        throw "Incorrect Input";
      const newAccount = await new transactionSchema({
        sender: sender._id,
        receiver: receiver._id,
        amount: amount,
        type: type
      }).save();
    } catch (error) {
      console.log(error.message);
      throw new Error("Failed to Log Transaction" + error.message);
    }
  },
  createCode: async (phoneNum, amount, type) => {
    try {
      const account = await handleDatabase.getAccount(phoneNum);
      if (account == null) throw new Error("Invalid Account");
      if (amount == null || isNaN(amount) || amount == 0)
        throw new Error("Invalid Amount");
      if (type != "deposit" && type != "withdraw")
        throw Error("Invalid Code Type");
      const newCode = await new codeSchema({
        codeType: type,
        code: shortid.generate(),
        amount: amount,
        creatorAccount: account._id
      }).save();
      return newCode.code;
    } catch (error) {
      console.log(error.message);
      throw new Error("Failed to create code" + error.message);
    }
  },
  getCode: async code => {
    try {
      return await codeSchema.findOne({ code: code });
    } catch (error) {
      console.log(error);
      throw new Error("Failed to retreive transfer code:" + error.message);
    }
  },
  consumeCode: async (phoneNum, code) => {
    // TO-DO
    console.log(code);
  }
};
module.exports = handleDatabase;
