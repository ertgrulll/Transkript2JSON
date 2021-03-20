const rdl = require("readline");
const os = require("os");
const fs = require("fs");
const path = require("path");

const { remote } = require("electron");
const process = remote.getGlobal("process");
const Logger = require("./logService");
const logger = new Logger.Logger();

const { BG_COLORS, FONT_STYLES } = require("../constants");
const constants = require("../constants");

const rl = rdl.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "T2J> ",
});

String.prototype.colorize = function (color) {
  return color + this + FONT_STYLES.resetAll;
};

exports.ask = async question => {
  question = question.colorize(BG_COLORS.grey);
  return new Promise(resolve => {
    rl.question(question, answer => {
      return resolve(answer);
    });
  });
};

exports.askPath = async question => {
  let suppliedPath;
  let isValid = false;

  while (!isValid) {
    let tmp = await this.ask(question);
    suppliedPath = tmp.replace("~", os.homedir());
    suppliedPath = path.normalize(suppliedPath);
    isValid =
      fs.existsSync(suppliedPath) && fs.lstatSync(suppliedPath).isDirectory();
  }
  logger.clearCli();
  return Promise.resolve(suppliedPath);
};

exports.askChar = async question => {
  question = question.colorize(constants.BG_COLORS.grey);

  return new Promise(async resolve => {
    while (true) {
      let ans = await this.ask(question);
      if (ans === "e") {
        resolve(true);
        break;
      } else if (ans === "h") {
        resolve(false);
        break;
      } else {
        logger.clearCli();
        logger.log(Logger.WARN, "e veya h tuslarini kullanin!");
      }
    }
  });
};

exports.askToContinue = async question => {
  question = question.colorize(constants.BG_COLORS.grey);
  return new Promise(async resolve => {
    let ans = await this.ask(question);

    if (ans == 0) {
      resolve(true);
    }
  });
};

exports.askOption = async (question, options) => {
  return new Promise(async resolve => {
    question = question.colorize(constants.BG_COLORS.grey);
    let optIndexes = [];

    for (let i = 0; i < options.length; i++) {
      logger.print(`[${i + 1}] ${options[i]}`);
      optIndexes.push(i + 1);
    }
    logger.print(`[0] Cikis\n`);

    let selection = await this.ask(question);

    if (selection === "0") {
      logger.clearCli();
      process.exit(0);
    }
    let index = +selection - 1;
    resolve(index);
    process.stdin.removeListener("pause");
  });
};
