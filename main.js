const { app, BrowserWindow, screen } = require("electron");
const path = require("path");
const process = require("process");

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
      /* devTools: true, */ // toggle for dev
    },
  });
  win.setIcon(iconPath);
  win.loadFile("index.html"); // toggle for dev
  /* win.webContents.openDevTools(); */ win.removeMenu();
  return win;
}

app.whenReady().then(() => {
  let isCalledViaCLI = checkIfCalledViaCLI(process.argv);
  const width = screen.getPrimaryDisplay().workAreaSize.width / 2;
  const height = screen.getPrimaryDisplay().workAreaSize.height / 1.5;
  var win;

  if (isCalledViaCLI) {
    /* win = createWindow(true, width, height); */ //toggle for dev
    getArgs();
    win = createWindow(false, 0, 0); //toggle for dev
  } else {
    win = createWindow(true, width, height);
  }

  win.once("ready-to-show", () => {
    if (isCalledViaCLI) {
      win.hide(); //toggle for dev
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

function checkIfCalledViaCLI(args) {
  if (args && args.length > 1) {
    return true;
  }
  return false;
}

function getArgs() {
  let epText =
    "\033[38;5;190m***********************************\n* Developer info:                 * \n*         Ertugrul Yakin          *\n*  https://ertugrulyakin.engineer *\n***********************************\033[39m";
  var yargs = require("yargs/yargs")(process.argv.slice(1))
    .usage("Kullanım:\n \ttranskript2json <komut> [secenekler]")
    .command("gen", "Json uret, transkript.pdf -> transkript.json")
    .example("transkript2json gen -f ~/dosya", "*Tek pdf'den json uretir.")
    .example(
      "transkript2json gen -F ~/dizin",
      "*Dizin altindaki tum transkriptlerden json uretir."
    )
    .example(
      "transkript2json gen -f ~/transkript -d",
      "Json uretirken loglar olusturur."
    )
    .alias("f", "file")
    .nargs("f", 1)
    .describe("f", "Dosya yolu")
    .string("f")
    .normalize("f")
    .alias("F", "folder")
    .nargs("F", 1)
    .normalize("F")
    .describe("F", "Dizin yolu")
    .string("F")
    .alias("d", "debug")
    .describe("d", "Debug modunda calistir, calisma raporu olusturulur.")
    .boolean("d")
    .demandCommand(1, "Bir komut girin!")
    .help("h")
    .alias("h", "help")
    .epilog(epText);

  var args = yargs.argv;

  if (args._.length) {
    let condition1 = args._.length != 1; //change to 2 for development
    let condition2 = args.f || args.file || args.F || args.folder;

    if (condition1 || condition2 == undefined) {
      console.log("Hatali kullanim, --help komutunu kullanin.");
      app.exit(0);
    }

    if (args.f) {
      global.filePath = args.f;
    } else if (args.F) {
      global.folderPath = args.F;
    }

    if (args.d) {
      global.debug = args.d;
    }
  }
}
