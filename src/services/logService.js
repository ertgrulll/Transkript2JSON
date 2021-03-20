const { remote, app } = require("electron");
const rdl = require("readline");
const path = require("path");
const swal = require("sweetalert");
const lottie = require("lottie-web");
const { FG_COLORS, FONT_STYLES } = require("../constants");

const logger = remote.getGlobal("console");
const process = remote.getGlobal("process");
const calledViaCli = remote.getGlobal("calledViaCli");
const debug = remote.getGlobal("debug");

const processing_element = document.getElementById("processing-container");

const INFO = "INFO";
const SUCCESS = "SUCCESS";
const WARN = "WARN";
const ERROR = "ERROR";
const FATAL = "FATAL_ERROR";
const FINISH = "FINISH";
const INLINE_INFO = "INLINE_INFO";

var timer;

String.prototype.colorize = function (color) {
  return color + this + FONT_STYLES.resetColor;
};

class Logger {
  constructor() {
    logger.clear();
    if (!calledViaCli) {
      lottie.loadAnimation({
        container: processing_element,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: path.resolve("assets", "processing.json"),
      });
    }
  }

  #cInlineInfo(mes) {
    process.stdout.write(
      (" ► " + mes + FONT_STYLES.resetAll).colorize(FG_COLORS.yellow)
    );
    rdl.cursorTo(process.stdout, 0);
  }

  #cInfo(mes) {
    logger.log(
      (" ► " + mes).colorize(FG_COLORS.yellow) + FONT_STYLES.resetAll + "\n"
    );
  }

  #cSuccess(mes) {
    logger.log(
      "\t ✔ ".colorize(FG_COLORS.green) + mes + "\n" + FONT_STYLES.resetAll
    );
  }

  #cWarn(mes) {
    logger.log(
      " ⚠ ".colorize(FG_COLORS.yellow) + mes + "\n" + FONT_STYLES.resetAll
    );
  }

  #cErr(mes) {
    logger.log(
      " ✘ ".colorize(FG_COLORS.red) +
        FONT_STYLES.bold +
        mes +
        FONT_STYLES.resetAll +
        "\n"
    );
  }

  #cFatal(mes) {
    logger.log(
      " ✘ ".colorize(FG_COLORS.red) +
        FONT_STYLES.underlinedBold +
        mes +
        FONT_STYLES.resetAll +
        "\n"
    );
    process.exit(0);
    app.exit(0);
  }

  #uErr(mes) {
    processing_element.style.display = "none";
    swal({ title: "Hata!", text: mes, icon: "error", button: "Kapat" });
  }

  #cFinish(mes, saveLocation) {
    clearInterval(timer);
    logger.log(
      FONT_STYLES.underline +
        mes.colorize(FG_COLORS.yellow) +
        "\n" +
        FONT_STYLES.resetAll
    );
    debug &&
      logger.log(`\n*** Detayli loglar icin ${saveLocation} konumuna bakiniz.`);

    process.exit(0);
    app.exit(0);
  }

  #uFinish(mes) {
    processing_element.style.display = "none";
    swal({
      title: "Başarılı!",
      text: mes,
      icon: "success",
      button: "Kapat",
      timer: 7000,
    });
  }

  startSpinner() {
    let index = 0;
    let chars = [" ◩", " ⬕", " ◪", " ⬔"];
    let chars2 = ["☰☰", "☱☱", "☲☲", "☴☴", "☶☶", "☷☷", "☶☶", "☵☵", "☳☳"]; //alternative spinners

    if (calledViaCli) {
      timer = setInterval(() => {
        process.stdout.write("\x1B[?25l");
        index = chars[index] ? index : 0;
        process.stdout.write(chars[index]);
        rdl.cursorTo(process.stdout, 0);
        index++;
      }, 60);
      return true;
    } else return false;
  }

  stopSpinner() {
    clearInterval(timer);
    rdl.clearLine(process.stdout);
  }

  clearCli = () => {
    logger.clear();
    return true;
  };

  log(level = INFO, mes, saveLocation) {
    if (calledViaCli) {
      this.stopSpinner();
      switch (level) {
        case INFO:
          this.#cInfo(mes);
          break;
        case INLINE_INFO:
          this.#cInlineInfo(mes);
          break;
        case SUCCESS:
          this.#cSuccess(mes);
          break;
        case WARN:
          this.#cWarn(mes);
          break;
        case ERROR:
          this.#cErr(mes);
          break;
        case FATAL:
          this.#cFatal(mes);
          break;
        case FINISH:
          this.#cFinish(mes, saveLocation);
          break;
        default:
          logger.log("Invalid level: " + level);
          break;
      }
    } else {
      switch (level) {
        case FATAL:
        case ERROR:
          this.#uErr(mes);
          break;
        case FINISH:
          this.#uFinish(mes);
          break;
        default:
          break;
      }
    }
  }

  print = mes => {
    logger.log(mes);
  };
}

module.exports = {
  Logger,
  INFO,
  INLINE_INFO,
  SUCCESS,
  WARN,
  ERROR,
  FATAL,
  FINISH,
};
