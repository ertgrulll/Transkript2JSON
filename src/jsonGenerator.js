const path = require("path");
const pdfjsLib = require("pdfjs-dist");

const { startDebugger } = require("./debugger.js");
const constants = require("./constants.js");
const fileService = require("./services/fileService.js");

const Logger = require("./services/logService.js");
var logger = new Logger.Logger();

var saveLocation = "";
var json = {};
var processing_element = document.getElementById("processing-container");

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "./node_modules/pdfjs-dist/build/pdf.worker.js";

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

var startTransformation = {
  f: async files => {
    saveLocation = path.dirname(files[0].path);
    let resArr = [];
    let uploadedFileNum = files.length,
      InvalidFileNum = 0,
      processedFileNum = 0;

    logger.startSpinner() || (processing_element.style.display = "block");

    for (let i = 0; i < uploadedFileNum; i++) {
      let status = true;
      let file = files[i];

      try {
        let pdfDocument = await readPdf.f(file);
        let pages = await extractPages.f(pdfDocument);
        await checkFile.f(pages[0]);

        await clearPages(pages);
        let resultsObj = await extractResults.f(pages);
        let { studentInfoObj, docDateObj } = await extractStudentInfo.f(
          pages[0]
        );
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

        processedFileNum++;

        resArr.push({
          name: file.name,
          saveLocation: saveLocation,
          data: json,
        });
      } catch (err) {
        logger.log(Logger.ERROR, file.name + err);
        InvalidFileNum++;
        status = false;
      }
      checkProcessStatus(
        files.length,
        processedFileNum,
        InvalidFileNum,
        file ? file.name : "",
        status
      );
    }
    return Promise.resolve(resArr);
  },
};

var checkFile = {
  f: async page => {
    return new Promise((resolve, reject) => {
      let { items } = page;
      let checkVal = "";

      for (let i = 0; i < 4; i++) {
        checkVal += items[i].str + " ";
      }

      if (
        !checkVal.includes("TEKİRDAĞ NAMIK KEMAL ÜNİVERSİTESİ") ||
        !checkVal.includes("TRANSKRİPT")
      ) {
        reject(`: Transkript gecerli degil!`);
      } else {
        resolve(true);
      }
    });
  },
};

var readPdf = {
  f: file => {
    var uri = file.path || file;
    return new Promise((resolve, reject) => {
      var loadingTask = pdfjsLib.getDocument(uri);
      loadingTask.promise
        .then(async function (pdfDocument) {
          resolve(pdfDocument);
        })
        .catch(_ => {
          reject(`: Hatali dosya uzantisi!`);
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

var clearPages = async pages => {
  for (let i = pages.length - 1; i >= 0; i--) {
    let { items } = pages[i];
    items.pop(); // removes page nums
    let unnecessaryInfoStart = items.findIndex(({ str }) =>
      str.includes("Kısaltmalar")
    );
    if (unnecessaryInfoStart >= 0) {
      items.splice(unnecessaryInfoStart);
    }
  }
};

var extractResults = {
  f: pages => {
    var resObj = {};

    for (let i = pages.length - 1; i >= 0; i--) {
      let { items } = pages[i];
      items.forEach(({ str }) => {
        if (str.toLowerCase().includes("kredi toplamı")) {
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
      logger.log(Logger.ERROR, constants.RES_ERR);
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
      logger.log(Logger.ERROR, constants.DOC_DATE_ERR);
    }

    let startIndex = ti.findIndex(({ str }) => str.includes("Öğrenci No"));
    startIndex >= 0
      ? ti.splice(0, startIndex)
      : logger.log(Logger.FATAL, "Ogrenci No");
    let lastIndex = ti.findIndex(({ str }) => str.includes("Ders Tipi")) - 1;
    let studentInfoPart = ti.splice(0, lastIndex - startIndex + 4);

    for (let i = 0; i < studentInfoPart.length; i++) {
      let { str } = studentInfoPart[i];

      if (str == ":" && i == 0) {
        logger.log(
          Logger.FATAL,
          "Ogrenci bilgileri parse edilemiyor, islem durduruldu!"
        );
        /* throw new Error("İşlem durduruldu!"); */
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
        lectureObj[constants.LECTURE_KEYS[0]] = correctVal;
        semesterLectures.splice(i, 1);
        i--;
        continue;
      }

      lectureObj[constants.LECTURE_KEYS[j]] = semesterLectures[i].str.trim();

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
  f: async (semesterLectures, indexesArray, requiredIndex, reg, fac) => {
    var lostIndexes = [];

    const len = semesterLectures.length;
    const blankObj = { str: "" };

    for (let i = 0; i < indexesArray.length; i++) {
      if (indexesArray[i] % 10 != requiredIndex) {
        if (
          indexesArray[i] != len && //changed here (+1)
          !reg.test(semesterLectures[indexesArray[i]].str)
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

var funcs = [
  startTransformation,
  readPdf,
  extractPages,
  checkFile,
  extractResults,
  extractStudentInfo,
  extractSemesters,
  formatLectures,
  fillLostIndexes,
  fillIndexes,
];

async function generateJSON(p, debug = false) {
  let files = await fileService.checkPath.f(p);

  debug &&
    startDebugger(funcs, constants.FUNC_NAMES, path.dirname(files[0].path));

  let res = await startTransformation.f(files);
  return Promise.resolve(res);
}

const checkProcessStatus = (uploaded, processed, invalid, fName, status) => {
  status && logger.log(Logger.INLINE_INFO, `${fName} json'a donusturuldu!`);
  if (invalid == uploaded) {
    logger.log(Logger.FATAL, constants.INVALID_ERR_MES);
  }
  if (processed == uploaded - invalid && invalid != 0) {
    logger.log(Logger.INFO, constants.SEPERATOR);
  }
};

module.exports = {
  generateJSON,
  startTransformation,
  readPdf,
  extractPages,
  checkFile,
  extractStudentInfo,
};
