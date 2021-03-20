const { app, BrowserWindow, screen } = require("electron");
const path = require("path");
const process = require("process");

const { checkIfCalledViaCLI } = require("./src/services/commandService");

const iconPath = path.resolve(__dirname, "./assets/icon.png");

function createWindow(willShow, w, h) {
  const win = new BrowserWindow({
    height: h,
    width: w,
    backgroundColor: "#2b2b2b",
    icon: iconPath,
    show: willShow,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
  });
  win.setIcon(iconPath);
  win.loadFile("index.html");

  win.removeMenu();
  return win;
}

app.whenReady().then(() => {
  let isCalledViaCLI = checkIfCalledViaCLI(process.argv);
  const width = screen.getPrimaryDisplay().workAreaSize.width / 2;
  const height = screen.getPrimaryDisplay().workAreaSize.height / 1.5;
  var win;

  if (isCalledViaCLI) {
    win = createWindow(false, 0, 0);
  } else {
    win = createWindow(true, width, height);
  }

  win.once("ready-to-show", () => {
    if (isCalledViaCLI) {
      win.hide();
    } else {
      win.show();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
