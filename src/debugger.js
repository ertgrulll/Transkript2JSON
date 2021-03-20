const fs = require("fs");
const path = require("path");

const Logger = require("./services/logService.js");
var logger = new Logger.Logger();

const startDebugger = function (funcs, funcNames, logPath) {
  logger.log(Logger.INFO, "Started Debug Mode");

  let logFileDir = path.join(logPath, "T2J_DEBUG");
  let logFilePath = path.join(logFileDir, "debug.log");

  logger.log(Logger.WARN, `Log dosyasi yolu: ${logFilePath}\n`);

  if (!fs.existsSync(logFileDir)) {
    fs.mkdirSync(logFileDir);
  }
  if (fs.existsSync(logFilePath)) {
    fs.unlinkSync(logFilePath);
  }

  for (let i = 0; i < funcs.length; i++) {
    funcs[i].f = (function () {
      var tmp = funcs[i].f;

      return function () {
        let debugText = "";
        let runningMes = `----> ${funcNames[i].n} function running...\n`;

        debugText += runningMes;

        let args;
        try {
          args = JSON.stringify(arguments);
        } catch (e) {
          args = arguments.toString();
        }
        let paramMes = `${funcNames[i].n}@params:\n${args}\n`;
        debugText += paramMes;

        logger.log(
          Logger.INFO,
          "\033[38;5;190m" + runningMes.replace("\n", "") + "\033[39m"
        );

        var result = tmp.apply(this, arguments);

        logger.log(Logger.INFO, "\033[38;5;246m" + funcNames[i].d + "\033[39m");
        var detailMes = funcNames[i].d + "\n";
        debugText += detailMes;

        if (typeof result === "object") {
          result.then(res => {
            let resStr = createDebugVal(res);

            let resMes = `==> ${funcNames[i].n}@returned:${resStr}\n\n`;
            debugText += resMes;

            logger.log(
              Logger.INFO,
              "\033[38;5;76m" +
                funcNames[i].n +
                "@returned:\033[39m " +
                "object" +
                "\n\n"
            );
          });
        } else {
          let resMes = `==> ${
            funcNames[i].n
          }@returned:${result.toString()}@${typeof result}\n\n`;
          debugText += resMes;

          logger.log(
            Logger.INFO,
            "\033[38;5;76m" +
              funcNames[i].n +
              "@returned:\033[39m " +
              typeof result +
              "\n\n"
          );
        }

        var stream = fs.createWriteStream(logFilePath, {
          flags: "a",
        });
        stream.write(debugText + "\n");
        stream.end();

        return result;
      };
    })();
  }
  logger.log(Logger.INFO, "Updated funcs for debugging");
};

var createDebugVal = res => {
  let resStr = "";
  let i = 0;

  if (Array.isArray(res)) {
    res.forEach(r => {
      if (r.items) {
        r.items.forEach(({ str }) => {
          resStr += `${str} - `;
          i == 20 ? (resStr += "\n") : "";
          i++;
        });
      } else if (r.length > 0) {
        r.forEach(({ str }) => {
          resStr += `${str} - `;
          i == 20 ? (resStr += "\n") : "";
          i++;
        });
      } else {
        resStr += `${r.str} - `;
      }
    });
  } else {
    resStr = JSON.stringify(res);
  }

  return resStr;
};

module.exports = { startDebugger, createDebugVal };
