const { app, BrowserWindow, screen } = require("electron");
const path = require("path");

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const iconPath = path.resolve(__dirname, "./assets/frame_icon.png");
  const win = new BrowserWindow({
    height: height / 1.5,
    width: width / 2,
    backgroundColor: "#2b2b2b",
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });
  win.setIcon(iconPath);
  win.removeMenu();
  win.loadFile("index.html");
}

app.whenReady().then(createWindow);

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
