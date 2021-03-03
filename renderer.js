const fs = require("fs");
const path = require("path");
const pdfjsLib = require("pdfjs-dist");
const lottie = require("lottie-web");
const { remote } = require("electron");
const { app } = require("electron").remote;

const logger = remote.getGlobal("console");
var folderPath = remote.getGlobal("folderPath");
var filePath = remote.getGlobal("filePath");
var debug = remote.getGlobal("debug");
var debugLogText = "";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "./node_modules/pdfjs-dist/build/pdf.worker.js";

const fileInput = document.getElementById("inpFile");
var files;

const lectureKeys = [
  "ders_kodu",
  "ders_adi",
  "ders_tipi",
  "aldigi_donem",
  "k",
  "akts",
  "not",
  "ks",
  "puan",
  "basari_durumu",
];

var json = {};
var uploadedFileNum = 0;
var processedFileCounter = 0;
var processing_element = document.getElementById("processing-container");

String.prototype.toJsonKey = function () {
  return this.trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll(".", "")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");
};

fileInput.onchange = _ => {
  files = fileInput.files;
  for (var i = 0; i < files.length; i++) {
    startTransformation.f(files[i]);
  }
  processedFileCounter = 0;
  uploadedFileNum = files.length;
};

var startTransformation = {
  f: async file => {
    try {
      let pdfDocument = await readPdf.f(file);
      let pages = await extractPages.f(pdfDocument);
      let isValid = await checkFile.f(pages[0]);
      if (!isValid) {
        uploadedFileNum--;
        if (filePath || folderPath) {
          logger.log(file.name + " gecerli bir transkript degil, atlaniyor.");
        }
        if (uploadedFileNum == 0) {
          if (filePath || folderPath) {
            logger.log(
              "Secilen dosyalar arasinda gecerli bir transkript bulunamadi!"
            );
            app.exit(0);
          } else {
            Qual.warningd(
              "Uyarı",
              "Seçilen dosyalar arasında geçerli bir transkript bulunamadı!"
            );
          }
        }
        return;
      }

      if (this.filePath == undefined && this.folderPath == undefined) {
        lottie.loadAnimation({
          container: processing_element,
          renderer: "svg",
          loop: true,
          autoplay: true,
          path: "./assets/processing.json",
        });
        processing_element.style.display = "block";
      }

      let resultsObj = await extractResults.f(pages);
      let { studentInfoObj, docDateObj } = await extractStudentInfo.f(pages[0]);
      let { semestersArray, totalLectureCount } = await extractSemesters.f(
        pages
      );

      resultsObj["toplam_ders_sayisi"] = totalLectureCount;

      json = { ...docDateObj };
      json["ogrenci_bilgileri"] = { ...studentInfoObj };
      json["genel_toplam"] = { ...resultsObj };
      json["donemler"] = [];
      semestersArray.forEach(semester => {
        json["donemler"].push({ ...semester });
      });
    } catch (err) {
      if (this.filePath == undefined && this.folderPath == undefined) {
        Qual.warningd("Hata", err);
        processing_element.style.display = "none";
      } else {
        logger.log("Hata:\n" + JSON.stringify(err));
      }
    }

    createFile.f(file);
    return true;
  },
};

var checkFile = {
  f: async page => {
    let { items } = page;
    let checkVal = "";

    for (let i = 0; i < 4; i++) {
      checkVal += items[i].str.toLowerCase() + " ";
    }

    if (!checkVal.includes("teki̇rdağ namik kemal üni̇versi̇tesi̇")) {
      return Promise.resolve(false);
    } else {
      return Promise.resolve(true);
    }
  },
};

var readPdf = {
  f: file => {
    var uri = file.path;

    return new Promise((resolve, reject) => {
      var loadingTask = pdfjsLib.getDocument(uri);
      loadingTask.promise
        .then(async function (pdfDocument) {
          resolve(pdfDocument);
        })
        .catch(_ => {
          reject(
            `Yalnızca .pdf uzantılı dosyaları yükleyebilirsiniz.\n Hatalı dosya: ${file.name.toUpperCase()}`
          );
        });
    });
  },
};

var extractPages = {
  f: async doc => {
    let pageNum = doc.numPages;
    let pages = [];

    for (let i = 1; i <= pageNum; i++) {
      let page = await doc.getPage(i);
      let pageText = await page.getTextContent();

      pages.push(pageText);
    }

    return Promise.resolve(pages);
  },
};

var extractResults = {
  f: pages => {
    var resObj = {};

    for (let i = pages.length - 1; i >= 0; i--) {
      let { items } = pages[i];
      items.forEach(({ str }) => {
        if (str.toLowerCase().includes("kredi toplamı")) {
          let unnecessaryInfoStart = items.findIndex(({ str }) =>
            str.includes("Kısaltmalar")
          );
          if (unnecessaryInfoStart >= 0) {
            items.splice(unnecessaryInfoStart);
          }

          let resBeginning = items.findIndex(({ str }) =>
            str.toLowerCase().includes("genel not ortalaması")
          );

          items.splice(resBeginning).forEach(r => {
            let { str } = r;
            let key = str.substring(0, str.search(":")).toJsonKey();
            let val = str.substring(str.search(":") + 1).trim();
            resObj[key] = val;
          });
        }
      });
    }

    if (resObj == {}) {
      warn("Genel toplam");
    }

    return Promise.resolve(resObj);
  },
};

var extractStudentInfo = {
  f: text => {
    var studentInfoObj = new Object();
    var docDateObj = new Object();
    let ti = text.items;

    let docDateIndex = ti.findIndex(({ str }) => str.includes("Belge Tarihi"));
    if (docDateIndex >= 0) {
      let docDate = ti
        .splice(docDateIndex, 1)[0]
        .str.split(":")
        .map(e => e.trim());
      docDateObj[docDate[0].toJsonKey()] = docDate[1];
    } else {
      warn("Belge Tarihi");
    }

    let startIndex = ti.findIndex(({ str }) => str.includes("Öğrenci No"));
    startIndex >= 0 ? ti.splice(0, startIndex) : er("Ogrenci No");
    let lastIndex = ti.findIndex(({ str }) => str.includes("Ders Tipi")) - 1;
    let studentInfoPart = ti.splice(0, lastIndex - startIndex + 4);

    for (let i = 0; i < studentInfoPart.length; i++) {
      let { str } = studentInfoPart[i];

      if (str == ":" && i == 0) {
        logger.log("Ogrenci bilgileri parse edilemiyor!");
        throw new Error("İşlem durduruldu!");
      } else if (str == ":") {
        if (studentInfoPart[i - 1].str.includes("/")) {
          studentInfoPart[i - 1].str = studentInfoPart[i - 1].str.replaceAll(
            /\s*/g,
            ""
          );
        }

        let key = studentInfoPart[i - 1].str.toJsonKey();
        studentInfoObj[key] = studentInfoPart[i + 1].str;
      }
    }
    return Promise.resolve({ studentInfoObj, docDateObj });
  },
};

var extractSemesters = {
  f: async pages => {
    let semestersArray = [];
    let totalLectureCount = 0;

    for (let i = 0; i < pages.length; i++) {
      if (i != pages.length - 1) {
        pages[i].items.pop(); // removes page nums
      }

      var { items } = pages[i];
      let semestersObj = new Object();
      let semesterKeys = [];
      let SemesterBeginnings = items.reduce(
        (a, { str }, i) => (str.includes("Dönemi") ? a.concat(i) : a),
        []
      );

      SemesterBeginnings.forEach(i => {
        let { str } = items[i];
        let resObj = new Object();
        let key = str.substring(0, str.search(":"));
        let val = +str.substring(str.search(":") + 1).trim();
        resObj[key.toJsonKey()] = val;

        semesterKeys.push(resObj);
      });

      for (let i = SemesterBeginnings.length - 1; i >= 0; i--) {
        var semesterLecturesRaw = items.splice(SemesterBeginnings[i] + 9);
        items.splice(-9);

        let {
          semesterLecturesArr,
          lectureCount,
          totalSemesterAkts,
        } = await formatLectures.f(semesterLecturesRaw);
        semestersObj = { ...semesterKeys[i] };
        semestersObj["ders_sayisi"] = lectureCount;
        semestersObj["donem_akts_toplami"] = totalSemesterAkts;
        semestersObj["dersler"] = semesterLecturesArr;
        totalLectureCount += lectureCount;

        semestersArray.push(semestersObj);
        semestersObj = new Object();
      }
    }

    semestersArray.sort((a, b) => {
      let ad = a.donemi,
        bd = b.donemi;

      if (ad < bd) {
        return -1;
      }
      if (ad > bd) {
        return 1;
      }
      return 0;
    });
    return Promise.resolve({ semestersArray, totalLectureCount });
  },
};

var formatLectures = {
  f: async semesterLectures => {
    let lectureObj = new Object();
    let semesterLecturesArr = [];
    var totalSemesterAkts = 0;

    await fillLostIndexes.f(semesterLectures);

    for (let i = 0; i < semesterLectures.length; i++) {
      let j = i % 10;

      //Erasmus ders kodları alt satıra geçebiliyor...
      if (j == 1 && semesterLectures[i].str.trim().length <= 3) {
        let correctVal =
          semesterLectures[i - 1].str.trim() + semesterLectures[i].str.trim();
        lectureObj[lectureKeys[0]] = correctVal;
        semesterLectures.splice(i, 1);
        i--;
        continue;
      }

      lectureObj[lectureKeys[j]] = semesterLectures[i].str.trim();

      if (j == 9) {
        semesterLecturesArr.push(lectureObj);
        lectureObj = new Object();
      }
    }

    semesterLecturesArr.forEach(lecture => {
      totalSemesterAkts += Number(lecture.akts);
    });

    let lectureCount = Math.ceil(semesterLectures.length / 10);
    return Promise.resolve({
      semesterLecturesArr,
      lectureCount,
      totalSemesterAkts,
    });
  },
};

var fillLostIndexes = {
  f: async semesterLectures => {
    const scoreReg = /^\d+,\d{2}$/;
    const successReg = /^\D+-*\D*$/;
    const gradeReg = /^\D{2}$/;

    let successIndexes = semesterLectures.reduce(
      (a, { str }, i) => (scoreReg.test(str) ? a.concat(i + 1) : a),
      []
    );

    await fillIndexes.f(semesterLectures, successIndexes, 9, successReg, 0);

    let gradeIndexes = semesterLectures.reduce(
      (a, { str }, i) => (scoreReg.test(str) ? a.concat(i - 2) : a),
      []
    );

    await fillIndexes.f(semesterLectures, gradeIndexes, 6, gradeReg, 1);

    return Promise.resolve(true);
  },
};

var fillIndexes = {
  f: async (semesterLectures, indexesArray, requiredIndex, req, fac) => {
    var lostIndexes = [];

    const len = semesterLectures.length;
    const blankObj = { str: "" };

    for (let i = 0; i < indexesArray.length; i++) {
      if (indexesArray[i] % 10 != requiredIndex) {
        if (
          indexesArray[i] != len && //changed here (+1)
          !req.test(semesterLectures[indexesArray[i]].str)
        ) {
          lostIndexes.push(indexesArray[i]);
        }
        //if semester's last lecture not contains success status field fills here
        else if (indexesArray[i] == len) {
          semesterLectures.push(blankObj);
        }
      }
    }

    for (let i = 0; i < lostIndexes.length; i++) {
      semesterLectures.splice(lostIndexes[i] + i + fac, 0, blankObj);
    }

    return Promise.resolve(semesterLectures);
  },
};

var createFile = {
  f: file => {
    let date = new Date();
    let day = ("0" + date.getDate()).slice(-2);
    let month = ("0" + (date.getMonth() + 1)).slice(-2);
    let year = date.getFullYear();
    let fullDate = `${day}-${month}-${year}`;
    let lastSeperatorIndex = file.path.lastIndexOf(path.sep);
    let dir;

    if (lastSeperatorIndex < 0) {
      dir = ".";
    } else {
      dir =
        file.path.substring(0, file.path.lastIndexOf(path.sep)) +
        path.sep +
        `T2J_OUT(${fullDate})`;
    }

    let jsonFileName =
      file.name.substring(0, file.name.lastIndexOf(".")) + ".json";

    let fullDestPath = dir + path.sep + jsonFileName;

    if (!fs.existsSync(dir)) {
      fs.mkdir(dir, err => {
        if (err) logger.log(err);
      });
    }

    if (debug) {
      fs.writeFile(`${dir}${path.sep}debug.log`, debugLogText, err => {
        if (err) logger.log(err);
        else logger.log("Log dosyasi olusturuldu.");
      });
    }

    fs.writeFile(fullDestPath, JSON.stringify(json), err => {
      processedFileCounter++;
      if (err) throw err;
      if (uploadedFileNum == processedFileCounter) {
        if (this.filePath != undefined || this.folderPath != undefined) {
          logger.log(`-> ${jsonFileName} olusturuldu!`);
          logger.log(
            "\n\033[38;5;82m" +
              `${processedFileCounter} dosya dönüştürüldü,\n${dir} konumuna kayıt edildi.` +
              "\033[39m"
          );
          if (debug) {
            logger.log(`\n*** Detayli loglar icin ${dir} konumuna bakiniz.`);
          }
          app.exit(0);
        }
        processing_element.style.display = "none";
        Qual.successd(
          "Başarılı",
          `${processedFileCounter} dosya dönüştürüldü, ${dir} konumuna kayıt edildi.`
        );
        processedFileCounter = 0;
      }
      logger.log(`-> ${jsonFileName} olusturuldu!`);
    });
    return true;
  },
};

var extractFileName = {
  f: function (filePath) {
    let index = filePath.lastIndexOf(path.sep);
    let res;
    index < 0 ? (res = filePath) : (res = filePath.slice(index));
    return res;
  },
};

var getFilesFromPath = {
  f: folderPath => {
    let isDirExists = fs.existsSync(folderPath);
    if (!isDirExists) {
      logger.log("Hatali dizin yolu!");
      app.exit(0);
    }

    let fStat = fs.lstatSync(folderPath);
    if (fStat.isFile()) {
      logger.log("Girilen yol bir dosyaya ait! --help komutunu kullanin.");
      app.exit(0);
    }

    let files = fs.readdirSync(folderPath);
    let filesObjArray = [];
    for (let i = 0; i < files.length; i++) {
      let filePath = path.join(folderPath, files[i]);
      let stat = fs.lstatSync(filePath);

      if (stat.isDirectory()) {
        logger.log("\033[38;5;208m-> Dizin bulundu, atlaniyor.\033[39m");
        continue;
      }

      filesObjArray.push({ name: files[i], path: filePath });
    }

    return filesObjArray;
  },
};

const startDebugger = _ => {
  logger.log("Started Debug Mode");

  var funcs = [
    startTransformation,
    readPdf,
    extractPages,
    checkFile,
    extractResults,
    extractStudentInfo,
    extractSemesters,
    createFile,
    formatLectures,
    fillLostIndexes,
    fillIndexes,
    extractFileName,
  ];

  var funcNames = [
    { n: "startTransformation", d: "Starting trasnformation" },
    { n: "readPdf", d: "Reading pdf info" },
    { n: "extractPages", d: "Extracting pages from pdf" },
    { n: "checkFile", d: "Checking if a valid file" },
    { n: "extractResults", d: "Extracting results from pdf" },
    { n: "extractStudentInfo", d: "Extracting student info from pdf" },
    { n: "extractSemesters", d: "Extracting semesters from pdf" },
    { n: "createFile", d: "Json file created successfully!" },
    { n: "formatLectures", d: "Starting to format lectures" },
    { n: "fillLostIndexes", d: "Searching lectures lost indexes" },
    { n: "fillIndexes", d: "Filling lectures lost indexes" },
    { n: "extractFileName", d: "extracting file name from path" },
  ];

  for (let i = 0; i < funcs.length; i++) {
    funcs[i].f = (function () {
      var tmp = funcs[i].f;

      return function () {
        let runningMes = `----> ${funcNames[i].n} function running...\n`;
        debugLogText += runningMes;

        let args;
        try {
          args = JSON.stringify(arguments);
        } catch (e) {
          args = arguments.toString();
        }
        let paramMes = `${funcNames[i].n}@params:\n${args}\n`;
        debugLogText += paramMes;

        logger.log(
          "\033[38;5;190m" + runningMes.replace("\n", "") + "\033[39m"
        );

        var result = tmp.apply(this, arguments);

        logger.log("\033[38;5;246m" + funcNames[i].d + "\033[39m");
        var detailMes = funcNames[i].d + "\n";
        debugLogText += detailMes;

        if (typeof result === "object") {
          result.then(res => {
            let resMes = `==> ${funcNames[i].n}@returned:${JSON.stringify(
              res
            )}\n\n`;
            debugLogText += resMes;

            logger.log(
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
          debugLogText += resMes;

          logger.log(
            "\033[38;5;76m" +
              funcNames[i].n +
              "@returned:\033[39m " +
              typeof result +
              "\n\n"
          );
        }

        return result;
      };
    })();
  }
  logger.log("Updated funcs for debugging");
};

if (folderPath || filePath) {
  if (debug) {
    startDebugger();
  }
  var fileObj = new Object();
  if (filePath) {
    let isFileExists = fs.existsSync(filePath);
    if (!isFileExists) {
      logger.log("Hatali dosya yolu!");
      app.exit(0);
    }
    let stat = fs.lstatSync(filePath);
    if (!stat.isFile()) {
      logger.log("Girilen yol bir dizine ait! --help komutunu kullanin.");
      app.exit(0);
    }
    fileObj["name"] = extractFileName.f(filePath);
    fileObj["path"] = filePath;
    uploadedFileNum = 1;
    startTransformation.f(fileObj);
  }
  if (folderPath) {
    let fileObjArray = getFilesFromPath.f(folderPath);
    uploadedFileNum = fileObjArray.length;
    fileObjArray.forEach(file => {
      startTransformation.f(file);
    });
  }
}

//DEBUG METHODS
const warn = w => {
  logger.log("\x1b[33m", "\n\n\t\t\t**UYARI**\t\t\t", "\x1b[0m");

  logger.log(
    "\x1b[36m",
    "\x1b[4m",
    `Dosyada '${w}' parametresi bulunamadi, json '${w}' icermeyecek.`,
    "\x1b[0m"
  );
};

const er = e => {
  logger.log("\x1b[31m", "\n\n\t\t\t**HATA**\t\t\t", "\x1b[0m");

  logger.log(
    "\x1b[36m",
    "\x1b[4m",
    `Dosyada '${e}' parametresi bulunamadi, islem durduruldu.\nLoglar icin bkz: `,
    "\x1b[0m"
  );
  throw new Error("İşlem durduruldu!");
};
