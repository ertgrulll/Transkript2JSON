const { remote, app } = require("electron");
const { generateJSON, startTransformation } = require("./src/jsonGenerator.js");
const { createFile, validateDir } = require("./src/services/fileService");
const { checkGraduation } = require("./src/graduationChecker.js");
const process = remote.getGlobal("process");

const Logger = require("./src/services/logService");
const logger = new Logger.Logger();

const calledViaCli = remote.getGlobal("calledViaCli");
const out = remote.getGlobal("out");

const runOnCli = async () => {
  const generate = remote.getGlobal("generate");
  const check = remote.getGlobal("check");
  const config = remote.getGlobal("config");
  const debug = remote.getGlobal("debug");
  const fPath = remote.getGlobal("fPath");

  config && startConfig();
  generate && startGenerator(fPath, debug);
  check && startChecker(fPath, debug);
};

const runOnUi = async () => {
  const fileInput = document.getElementById("inpFile");

  fileInput.onchange = async _ => {
    let files = fileInput.files;
    let jsonArr = await generateJSON(files);

    if (jsonArr.length != 0) {
      await createFile.f(jsonArr, saveLocation, "json");
    }
  };
};

const startConfig = async () => {
  const { Configs } = require("./src/configs");
  let cfg = new Configs();
  cfg.init();
};

const startChecker = async (fPath, debug) => {
  let saveLocation = await validateDir(out, fPath);
  let jsonArr = debug
    ? await generateJSON(fPath, true)
    : await generateJSON(fPath);

  try {
    let results = await checkGraduation(jsonArr);
    if (results.length) await createFile.f(results, saveLocation, "log");
    else logger.log(Logger.INFO, "Gecerli bir katalog ekleyin!");
  } catch (e) {
    logger.log(Logger.ERROR, e);
  }

  process.exit(0);
  app.exit(0);
};

const startGenerator = async (fPath, debug) => {
  let saveLocation = await validateDir(out, fPath);
  let jsonArr = debug
    ? await generateJSON(fPath, true)
    : await generateJSON(fPath);

  if (jsonArr.length != 0) {
    await createFile.f(jsonArr, saveLocation, "json");
  }
  process.exit(0);
  app.exit(0);
};

calledViaCli ? runOnCli() : runOnUi();
