const axios = require("axios").default;
const constants = require("../constants");

const lectureHeaders = ["ders_kodu", "ders_adi", "t", "u", "akts"];

// Continue for ui...

/* const btnScrape = document.querySelector("#scrape"); */
/* btnScrape.addEventListener("click", async _ => {
  const htmlDoc = await getHtmlPage(oldLectstUri);
  const classes = getClasses(htmlDoc);
  const rawClasses = await extractTableTexts(classes);
  const parsedClasses = await extractSemester(rawClasses);

  for (let i = 0; i < parsedClasses.length; i++) {
    for (let j = 0; true; j++) {
      if (parsedClasses[i][`d${j}`] != undefined) {
        parsedClasses[i][`d${j}`].donem_dersleri = parseLectures(
          parsedClasses[i][`d${j}`].donem_dersleri
        );
      } else break;
    }
  }

  let res = new Object();
  for (let i = 0; i < parsedClasses.length; i++) {
    res[`_${i + 1}`] = parsedClasses[i];
  }

  console.log(JSON.stringify(res));
}); */

exports.getCatalog = async uri => {
  return new Promise(async (resolve, reject) => {
    try {
      const htmlDoc = await getHtmlPage(uri);
      const department = await getDepartment(htmlDoc);
      const year = await getYear(htmlDoc);
      const classes = getClasses(htmlDoc);

      const rawClasses = await extractTableTexts(classes);
      const parsedClasses = await extractSemester(rawClasses);
      if (parsedClasses.length == 0) throw new Error(constants.PARSE_LECT_ERR);

      for (let i = 0; i < parsedClasses.length; i++) {
        for (let j = 0; true; j++) {
          if (parsedClasses[i][`d${j}`] != undefined) {
            parsedClasses[i][`d${j}`].donem_dersleri = parseLectures(
              parsedClasses[i][`d${j}`].donem_dersleri
            );
          } else break;
        }
      }

      let res = new Object();
      res["programi"] = department;
      res["yil"] = year;

      for (let i = 0; i < parsedClasses.length; i++) {
        res[`_${i + 1}`] = parsedClasses[i];
      }

      resolve(res);
    } catch (e) {
      reject(e);
    }
  });
};

var getHtmlPage = async uri => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axios.get(uri);
      let parser = new DOMParser();
      let htmlDoc = parser.parseFromString(
        response.request.responseText,
        "text/html"
      );
      resolve(htmlDoc);
    } catch (error) {
      reject(constants.URI_ERR);
    }
  });
};

var getDepartment = async htmlDoc => {
  return new Promise((resolve, reject) => {
    let tr = htmlDoc.querySelector("tr > td > font");
    let { innerText } = tr;
    let sliceEnd = innerText.toLowerCase().indexOf("ders");
    let department = innerText.slice(0, sliceEnd);
    !department && reject(constants.DEPARTMENT_ERR);

    resolve(department.trim());
  });
};

var getYear = htmlDoc => {
  return new Promise((resolve, reject) => {
    let tr = htmlDoc.querySelector("tr > td > b");
    let { innerText } = tr;
    let sliceEnd = innerText.toLowerCase().indexOf("güz");
    let year = innerText.slice(0, sliceEnd);
    !year && reject(constants.DEPARTMENT_ERR);

    resolve(year.trim());
  });
};

var getClasses = htmlDoc => {
  let classes = [];
  var doc;

  let rows = Array.from(htmlDoc.getElementsByTagName("tr"));

  let headerIndexes = rows
    .flatMap((row, i) =>
      Array.from(row.cells).some(e => e.nodeName == "TH") &&
      row.children.length == 1
        ? i
        : []
    )
    .sort((a, b) => b - a);

  headerIndexes.forEach(i => {
    doc = document.createElement("html");
    rows.splice(i).forEach(tr => {
      doc.appendChild(tr);
    });
    classes.unshift(doc);
  });

  return classes;
};

var extractTableTexts = async docs => {
  var classTexts = [];

  docs.forEach(doc => {
    let thElement = doc.querySelector("th");
    let tdElements = doc.querySelectorAll("td");

    let tdArray = Array.from(tdElements)
      .filter(
        td =>
          td.getElementsByTagName("a").length == 0 &&
          !/^\s*$/.test(td.innerText)
      )
      .splice(1);

    let texts = Array.from(tdArray, td => {
      let b = td.querySelector("b");
      if (b) {
        return b.innerText.trim();
      } else {
        return td.innerText.trim();
      }
    });
    texts.unshift(thElement.innerText.trim());
    classTexts.push(texts);
  });

  return Promise.resolve(classTexts);
};

var extractSemester = classes => {
  var parsedClasses = [];

  classes.forEach(cls => {
    let classObject = new Object();

    classObject["sinif"] = cls[0].match(/\d/g)[0];
    cls.splice(0, 1);

    let splitPoints = cls.reduce(
      (a, val, i) =>
        val.includes("Bahar") || val.search(/ Yaz/g) != -1 ? a.concat(i) : a,
      []
    );

    for (let i = splitPoints.length - 1; i >= 0; i--) {
      let semesterLecturesArr = cls.splice(splitPoints[i]);
      let semesterKey = semesterLecturesArr[0]
        .replaceAll(/\d+\s*-\s*\d+/g, "")
        .toJsonKey()
        .match(/^[A-Za-z]+/g);

      classObject[`d${i + 1}`] = {};
      classObject[`d${i + 1}`]["donem"] = semesterKey[0];

      let totalCredit = semesterLecturesArr.splice(
        semesterLecturesArr.length - 2
      );

      classObject[`d${i + 1}`][totalCredit[0].toJsonKey()] = totalCredit[1];

      classObject[`d${i + 1}`]["donem_dersleri"] = semesterLecturesArr.splice(
        1
      );

      if (i == 0) {
        classObject[`d${i}`] = {};
        let totalCredit = cls.splice(cls.length - 2);
        classObject[`d${i}`]["donem"] = "güz";
        classObject[`d${i}`][totalCredit[0].toJsonKey()] = totalCredit[1];
        classObject[`d${i}`]["donem_dersleri"] = cls;
      }
    }
    parsedClasses.push(classObject);
  });

  return Promise.resolve(parsedClasses);
};

var parseLectures = semesterLectures => {
  let parsedLectures = new Object();
  let {
    opt,
    optionalLectures,
    requiredLectures,
    max_optional_c,
  } = checkOptionalLectures(semesterLectures);
  let requiredLectObj = new Object();
  let optionalLectObject = new Object();

  if (opt) {
    parsedLectures["maks_secmeli_akts"] = max_optional_c;
    parsedLectures["secmeli"] = [];

    for (let i = 0; i < optionalLectures.length; i++) {
      optionalLectObject[lectureHeaders[i % 5]] = optionalLectures[i];

      if (i % 5 == 4) {
        parsedLectures["secmeli"].push(optionalLectObject);
        optionalLectObject = new Object();
      }
    }
  }

  parsedLectures["zorunlu"] = [];
  for (let i = 0; i < requiredLectures.length; i++) {
    requiredLectObj[lectureHeaders[i % 5]] = requiredLectures[i];

    if (i % 5 == 4) {
      parsedLectures["zorunlu"].push(requiredLectObj);
      requiredLectObj = new Object();
    }
  }
  return parsedLectures;
};

var checkOptionalLectures = cls => {
  let optionalLectures;
  let max_optional_c;

  for (let i = 0; i < cls.length; i++) {
    if (cls[i].toLowerCase().includes("seçmeli")) {
      max_optional_c = cls[i + 2];
      optionalLectures = cls.splice(i + 3);
      cls.splice(-3);
    }
  }

  if (max_optional_c) {
    return {
      opt: true,
      optionalLectures: optionalLectures,
      requiredLectures: cls,
      max_optional_c: max_optional_c,
    };
  }

  return { opt: false, requiredLectures: cls };
};

String.prototype.toJsonKey = function () {
  return this.trim()
    .toLowerCase()
    .replaceAll(".", "")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");
};
