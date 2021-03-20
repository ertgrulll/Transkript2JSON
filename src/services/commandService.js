const process = require("process");
const constants = require("../constants.js");
const fs = require("fs");
const { hideBin } = require("yargs/helpers");

const checkIfCalledViaCLI = args => {
  if (args && args.length) {
    getArgs(args);
    return true;
  }
  return false;
};

const getArgs = cliArgs => {
  require("yargs/yargs")(hideBin(cliArgs))
    .usage("Kullanım:\n \ttranskript2json <komut> <deger> [secenekler]")
    .command({
      command: "generate <file|folder> [out]",
      desc: "Json uret",
      aliases: ["gen"],
      builder: yargs => {
        yargs
          .positional("file", {
            describe: "Girdi dosya, dizin yolu",
            type: "string",
          })
          .positional("out", {
            describe:
              "Cikti kayit konumu, gonderilmezse girdi yolunda olusturulan dizin kullanilir",
            type: "string",
          });
      },
      handler: argv => {
        handleCommand(argv);
      },
    })
    .command({
      command: "check <file|folder> [out]",
      desc: "Mezuniyeti kontrol et",
      aliases: ["chk"],
      builder: yargs => {
        yargs
          .positional("file", {
            describe: "Girdi dosya, dizin yolu",
            type: "string",
          })
          .positional("out", {
            describe:
              "Kayit konumu, gonderilmezse girdi yolunda olusturulan dizin kullanilir",
            type: "string",
          });
      },
      handler: argv => {
        handleCommand(argv);
      },
    })
    .command({
      command: "config",
      desc: "Ayarlar",
      aliases: ["cfg"],
      handler: argv => {
        handleCommand(argv);
      },
    })
    .command({
      command: "info",
      desc: "Uygulama bilgilerini goster",
      aliases: ["inf"],
      handler: argv => {
        handleCommand(argv);
      },
    })
    .options(constants.FLAGS)
    .example(constants.CLI_EXAMPLES)
    .recommendCommands()
    .demandCommand(1, "Bir komut girin!")
    .help()
    .alias("h", "help").argv;

  global.calledViaCli = true;
};

const handleCommand = argv => {
  if (!argv || (argv && !argv._[0])) {
    console.log("Bir komut girin!");
    process.exit(0);
  }
  let { out, file, debug } = argv;

  switch (argv._[0]) {
    case "generate":
    case "gen":
      checkIfFileExist(file);
      global.generate = true;
      break;
    case "check":
    case "chk":
      checkIfFileExist(file);
      global.check = true;
      break;
    case "cfg":
    case "config":
      global.config = true;
      break;
    case "info":
    case "inf":
      showInfo();
      break;
    default:
      console.log("Gecerli Bir komut girin!"); //double-check
      process.exit(0);
  }

  global.fPath = file;
  out && (global.out = out);
  debug && (global.debug = debug);
};

const checkIfFileExist = file => {
  let isFileExists = fs.existsSync(file);
  if (!isFileExists) {
    console.log(constants.PATH_ERR);
    process.exit(0);
  }
};

const showInfo = () => {
  console.log(
    "Detayli kullanim icin repo: \n\thttps://github.com/ertgrulll/Transkript2JSON\n"
  );
  console.log(constants.DEVELOPER_INFO);
  process.exit(0);
};

module.exports = { checkIfCalledViaCLI };
