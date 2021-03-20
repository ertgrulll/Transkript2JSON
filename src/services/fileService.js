const fs = require("fs");
const path = require("path");
const os = require("os");

const constants = require("../constants.js");
const promptService = require("./promptService");
const Logger = require("./logService.js");
const logger = new Logger.Logger();

var createFile = {
  f: async (files, saveDir, ext) => {
    let date = new Date();
    let day = ("0" + date.getDate()).slice(-2);
    let month = ("0" + (date.getMonth() + 1)).slice(-2);
    let year = date.getFullYear();
    let outDirName = `T2J_OUT(${day}-${month}-${year})`;
    let subDirName = ext == "log" ? "graduation-results" : "generated-jsons";

    let outDirPath = path.join(saveDir, outDirName);
    let subDirPath = path.join(outDirPath, subDirName);

    if (!fs.existsSync(outDirPath)) fs.mkdirSync(outDirPath);
    if (!fs.existsSync(subDirPath)) fs.mkdirSync(subDirPath);

    files.forEach(async file => {
      let fName = path.basename(file.name, ".pdf") + `.${ext}`;
      let fullPath = path.join(subDirPath, fName);

      fs.writeFileSync(
        fullPath,
        ext == "json" ? JSON.stringify(file.data) : file.data
      );
      logger.log(Logger.SUCCESS, `${fName} olusturuldu!`);
    });

    logger.log(Logger.INFO, `Kayit konumu: ${subDirPath}`);
    logger.log(Logger.INFO, `Olusturulan dosya sayisi: ${files.length}`);
    return Promise.resolve(true);
  },
};

var validatePdf = async p => {
  p = p.replace("~", os.homedir());
  let isPdf =
    fs.existsSync(p) && fs.lstatSync(p).isFile() && path.extname(p) == ".pdf";

  return Promise.resolve({ is: isPdf, absPath: p });
};

var validateDir = async (dir, defaultDir) => {
  defaultDir || logger.log(Logger.FATAL, "Varsayilan dosya yolu gonderilmedi!");
  defaultDir = fs.lstatSync(defaultDir).isDirectory()
    ? defaultDir
    : path.dirname(defaultDir);
  var saveDir;

  if (dir && !fs.existsSync(dir)) {
    logger.log(Logger.INFO, `Hatali cikti yolu, varsayilan yol ${defaultDir}`);

    let contQ = "Varsayilan ile devam edilsin mi? [e/h] ";

    let eh = await promptService.askChar(contQ);

    if (eh) {
      saveDir = defaultDir;
      return Promise.resolve(saveDir);
    } else {
      saveDir = await promptService.askPath("Cikti yolu: ");
      return Promise.resolve(saveDir);
    }
  } else if (dir) {
    saveDir = dir;
  } else {
    saveDir = defaultDir;
  }
  return Promise.resolve(saveDir);
};

var checkPath = {
  f: async p => {
    let stat = fs.lstatSync(p);
    if (stat.isDirectory()) {
      let files = await getFilesFromPath.f(p);
      return files;
    }
    return [{ name: path.basename(p), path: p }];
  },
};

var getFilesFromPath = {
  f: async folderPath => {
    let files = fs.readdirSync(folderPath);
    let filesObjArray = [];
    for (let i = 0; i < files.length; i++) {
      let filePath = path.join(folderPath, files[i]);
      let stat = fs.lstatSync(filePath);

      if (stat.isDirectory()) {
        logger.log(Logger.WARN, constants.SKIP_FOLDER_MES);
        continue;
      }

      filesObjArray.push({ name: files[i], path: filePath });
    }

    return Promise.resolve(filesObjArray);
  },
};

var deleteFolder = async path => {
  return new Promise((resolve, reject) => {
    try {
      fs.rmdirSync(path, { recursive: true });
      resolve(true);
    } catch (e) {
      reject(constants.UNLINK_ERR + e);
    }
  });
};

module.exports = {
  checkPath,
  createFile,
  validateDir,
  validatePdf,
  deleteFolder,
};
