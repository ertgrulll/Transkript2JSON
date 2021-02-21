const lottie = require("lottie-web");
const fs = require("fs");
const pdfjsLib = require("pdfjs-dist");
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "./node_modules/pdfjs-dist/build/pdf.worker.js";

var fileInput = document.getElementById("inpFile");
var files;
const studentKeys = [
  "Öğrenci No",
  "Belge Tarihi",
  "T.C. Kimlik No",
  "Adı Soyadı",
  "Doğum Tarihi",
  "Eğitim Birimi",
  "Kayıt Tarihi",
  "Programı",
  "Giriş Türü",
  "Öğretim Düzeyi",
  "Sınıfı / Dönemi",
  "Öğretim Dili",
  "Kredi Türü",
  "Eğitim ve Öğretim Türü",
  "Not Sistemi",
  "Program Türü",
  "Genel Not Ortalaması",
  "Öğrenim Durumu",
  "AKTS Toplamı",
  "Kredi Toplamı",
  "Genel Toplam Puan",
];

const lectureKeys = [
  "Ders Kodu",
  "Ders Adı",
  "Ders Tipi",
  "Aldığı Dönem",
  "K",
  "AKTS",
  "Not",
  "KS",
  "Puan",
  "Başarı Durumu",
];

var json = {};
var uploadedFileNum = 0;
var processedFileCounter = 0;
var processing_element = document.getElementById("processing-container");

fileInput.onchange = _ => {
  files = fileInput.files;
  for (var i = 0; i < files.length; i++) {
    startTransformation(files[i]);
  }

  uploadedFileNum = files.length;
};

const startTransformation = async path => {
  lottie.loadAnimation({
    container: processing_element,
    renderer: "svg",
    loop: true,
    autoplay: true,
    path: "./assets/processing.json", // the path to the animation json
  });
  processing_element.style.display = "block";

  try {
    let pdfDocument = await readPdf(path);
    let textContent = await getTextContent(pdfDocument);

    await isFileValid(textContent);
    var { studentInfoText, lecturesText } = parseText(textContent);
    formatStudentInfo(studentInfoText);

    var semesters = formatSemesters(lecturesText);
  } catch (err) {
    Qual.warningd("Hata", err);
    processing_element.style.display = "none";
  }

  semesters.forEach((val, semesterKey) => {
    formatLectures(val, semesterKey);
  });

  let dir =
    path.path.substring(0, path.path.lastIndexOf("\\")) + "\\Transkript2JSON";

  let filePath =
    dir + "\\" + path.name.substring(0, path.name.lastIndexOf(".")) + ".json";

  if (!fs.existsSync(dir)) {
    fs.mkdir(dir, err => console.log(err));
  }
  createFile(filePath);
};

const createFile = filePath => {
  fs.writeFile(filePath, JSON.stringify(json), err => {
    processedFileCounter++;
    if (err) throw err;
    if (uploadedFileNum == processedFileCounter) {
      processing_element.style.display = "none";
      processedFileCounter = 0;
      Qual.successd(
        "Başarılı",
        `${uploadedFileNum} dosya ${filePath.substring(
          0,
          filePath.lastIndexOf("\\")
        )} konumuna JSON formatında kayıt edildi.`
      );
    }
    console.log("file created!");
  });
};

const parseText = text => {
  let studentInfo = text.substring(
    text.indexOf("Öğrenci No"),
    text.indexOf("Dönemi :")
  );

  let generalRes = text.substring(
    text.indexOf("AKTS Toplamı:"),
    text.indexOf("Kısaltmalar")
  );

  let lectures = text
    .substring(
      text.indexOf(studentInfo) + studentInfo.length,
      text.indexOf("Genel Not Ortalaması:")
    )
    .replaceAll(
      "Ders Tipi\nAldığı Dönem\nK\nAKTS\nNot\nKS\nPuan\nBaşarı Durumu",
      ""
    );

  studentInfo += generalRes;

  return { studentInfoText: studentInfo, lecturesText: lectures };
};

const isFileValid = text => {
  return new Promise((resolve, reject) => {
    studentKeys.forEach(key => {
      if (!text.includes(key)) reject("Geçerli bir transkript yüklenmedi!");
    });
    resolve(true);
  });
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

const getTextContent = async doc => {
  let pdfText = "";
  let pageNum = doc.numPages;
  for (var i = 1; i <= pageNum; i++) {
    let page = await doc.getPage(i);
    let pageTextContent = await page.getTextContent();

    pageTextContent.items.forEach(item => {
      pdfText += item.str + "\n";
    });
  }
  return Promise.resolve(pdfText);
};

const formatStudentInfo = text => {
  for (let i = 0; i < studentKeys.length; i++) {
    var nextKeyIndex;
    let startIndex = text.indexOf(studentKeys[i]);
    let endIndex = startIndex + studentKeys[i].length + 2;

    if (i == studentKeys.length - 1) {
      nextKeyIndex = text.length;
    } else nextKeyIndex = text.indexOf(studentKeys[i + 1]);
    json[studentKeys[i]] = text.slice(endIndex, nextKeyIndex).trim();
  }
};

const formatSemesters = text => {
  var semestersMap = new Map();
  let semesters = text.split(/Dönemi :  \d+/g);

  for (let i = 0; i < semesters.length; i++) {
    let semesterLectures = semesters[i].split("\n ");

    for (let i = 0; i < semesterLectures.length; i++) {
      if (
        semesterLectures[i] === "" ||
        semesterLectures[i] === " " ||
        semesterLectures[i] === "\n" ||
        semesterLectures[i].includes("TEKİRDAĞ NAMIK KEMAL ÜNİVERSİTESİ")
      ) {
        delete semesterLectures[i];
        continue;
      }

      if (semesterLectures[i].includes("*")) {
        for (let j = semesterLectures.length; j > i + 1; j--) {
          semesterLectures[j] = semesterLectures[j - 1];
        }
        let tmp = semesterLectures[i].split("\n*");
        semesterLectures[i] = tmp[0];
        semesterLectures[i + 1] = "*" + tmp[1];
        i++;
      }
    }
    if (i == 0) continue;
    json[`Dönem ${i}`] = [];
    semestersMap.set(`Dönem ${i}`, semesterLectures);
  }
  return semestersMap;
};

const formatLectures = (semesterLectures, semesterKey) => {
  let fieldCount = 10;

  let gradeReg = /^\D{2}$/;
  let scoreReg = /^\d+,\d{2}$/;
  let resReg = /^\D+-*\D*$/;

  semesterLectures.forEach(lecture => {
    let lectureFields = lecture.split("\n");
    let lectureFieldsLen = lectureFields.length;
    let obj = new Object();

    if (lectureFieldsLen != 10) {
      if (!scoreReg.test(lectureFields[lectureFields.length - 2])) {
        lectureFields.push(" ");
      }
      if (!resReg.test(lectureFields[lectureFields.length - 1])) {
        lectureFields.push(" ");
      }
    }

    for (let i = 0; i < fieldCount; i++) {
      if (i == 6 && !gradeReg.test(lectureFields[6])) {
        for (let j = 9; j > 6; j--) {
          lectureFields[j] = lectureFields[j - 1];
        }
        obj[lectureKeys[i]] = "";
      } else {
        obj[lectureKeys[i]] = lectureFields[i];
      }
    }
    json[semesterKey].push(obj);
  });
};
