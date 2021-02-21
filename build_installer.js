const { MSICreator } = require("electron-wix-msi");
const path = require("path");

const APP_DIR = path.resolve(__dirname, "./Transkript2JSON-win32-x64");
const OUT_DIR = path.resolve(__dirname, "./windows_installer");
const ICON_DIR = path.resolve(__dirname, "./assets/shortcut_icon.ico");

const msiCreator = new MSICreator({
  appDirectory: APP_DIR,
  outputDirectory: OUT_DIR,

  description: "NKU Transkript-JSON converter",
  exe: "Transkript2JSON",
  name: "Transkript2JSON",
  manufacturer: "Ertugrul Yakin",
  version: "1.0.0",
  appIconPath: ICON_DIR,

  ui: {
    chooseDirectory: true,
  },
});

msiCreator.create().then(function () {
  msiCreator.compile();
});
