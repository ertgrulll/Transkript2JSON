const lottie = require("lottie-web");
const fs = require("fs");
const process = require("process");
const path = require("path");
const pdfjsLib = require("pdfjs-dist");
const nodeConsole = require("console");

const logger = new nodeConsole.Console(process.stdout, process.stderr);

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
    startTransformation(files[i]);
  }

  uploadedFileNum = files.length;
};

const startTransformation = async filePath => {
  try {
    let pdfDocument = await readPdf(filePath);
    let pages = await extractPages(pdfDocument);

    //TODO: check results page here, before extract
    let isValid = await checkFile(pages[0]);
    if (!isValid) return;
    lottie.loadAnimation({
      container: processing_element,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: "./assets/processing.json", // the path to the animation json
    });
    processing_element.style.display = "block";

    let resultsObj = await extractResults(pages);
    let { studentInfoObj, docDateObj } = await extractStudentInfo(pages[0]);
    let { semestersArray, totalLectureCount } = await extractSemesters(pages);

    resultsObj["toplam_ders_sayisi"] = totalLectureCount;

    json = { ...docDateObj };
    json["ogrenci_bilgileri"] = { ...studentInfoObj };
    json["genel_toplam"] = { ...resultsObj };
    json["donemler"] = [];
    semestersArray.forEach(semester => {
      json["donemler"].push({ ...semester });
    });
  } catch (err) {
    Qual.warningd("Hata", err);
    processing_element.style.display = "none";
  }

  createFile(filePath);
};

const checkFile = async page => {
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
};

const readPdf = file => {
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
};

const extractPages = async doc => {
  let pageNum = doc.numPages;
  let pages = [];

  for (let i = 1; i <= pageNum; i++) {
    let page = await doc.getPage(i);
    let pageText = await page.getTextContent();

    pages.push(pageText);
  }

  return Promise.resolve(pages);
};

const extractResults = pages => {
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
};

const extractStudentInfo = text => {
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
};

const extractSemesters = async pages => {
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
      } = await formatLectures(semesterLecturesRaw);
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
};

const formatLectures = async semesterLectures => {
  let lectureObj = new Object();
  let semesterLecturesArr = [];
  var totalSemesterAkts = 0;

  await fillLostIndexes(semesterLectures);

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
};

const fillLostIndexes = async semesterLectures => {
  const scoreReg = /^\d+,\d{2}$/;
  const successReg = /^\D+-*\D*$/;
  const gradeReg = /^\D{2}$/;

  let successIndexes = semesterLectures.reduce(
    (a, { str }, i) => (scoreReg.test(str) ? a.concat(i + 1) : a),
    []
  );

  await fillIndexes(semesterLectures, successIndexes, 9, successReg, 0);

  let gradeIndexes = semesterLectures.reduce(
    (a, { str }, i) => (scoreReg.test(str) ? a.concat(i - 2) : a),
    []
  );

  await fillIndexes(semesterLectures, gradeIndexes, 6, gradeReg, 1);

  return Promise.resolve(true);
};

const fillIndexes = async (
  semesterLectures,
  indexesArray,
  requiredIndex,
  req,
  fac
) => {
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
};

const createFile = filePath => {
  let date = new Date();
  let day = ("0" + date.getDate()).slice(-2);
  let month = ("0" + (date.getMonth() + 1)).slice(-2);
  let year = date.getFullYear();
  let fullDate = `${day}-${month}-${year}`;

  let dir =
    filePath.path.substring(0, filePath.path.lastIndexOf(path.sep)) +
    path.sep +
    `T2J_OUT(${fullDate})`;

  let fullDestPath =
    dir +
    path.sep +
    filePath.name.substring(0, filePath.name.lastIndexOf(".")) +
    ".json";

  if (!fs.existsSync(dir)) {
    fs.mkdir(dir, err => console.log(err));
  }

  fs.writeFile(fullDestPath, JSON.stringify(json), err => {
    processedFileCounter++;
    if (err) throw err;
    if (uploadedFileNum == processedFileCounter) {
      processing_element.style.display = "none";
      Qual.successd(
        "Başarılı",
        `${processedFileCounter} dosya dönüştürüldü, ${dir} konumuna kayıt edildi.`
      );
      processedFileCounter = 0;
    }
    console.log("file created!");
  });
};

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
  createLogTxt();
  throw new Error("İşlem durduruldu!");
};

const createLogTxt = _ => {};
