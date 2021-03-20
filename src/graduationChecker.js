const constants = require("./constants");
const { Database } = require("./database");

const Logger = require("./services/logService");
const logger = new Logger.Logger();

const db = new Database();

var checkGraduation = async jsonArr => {
  return new Promise(async (resolve, reject) => {
    await db.init();
    var results = [];

    try {
      for (let i = 0; i < jsonArr.length; i++) {
        let { data } = jsonArr[i];
        let { donemler } = data;
        let catalogs;

        try {
          catalogs = await getCatalogs(jsonArr[i]); //@object  defaultCat, otherCats
        } catch (e) {
          logger.log(Logger.ERROR, `${e} icin katalog bulunamadi!`);
          continue;
        }

        let prepClass = await checkPrepClass(donemler);
        let { isOk, totalCredit } = checkTotalCredit(donemler, prepClass);
        let failed = await checkLectureSuccess(donemler); //@object: fails, unknowns
        let { defaultCat, otherCats } = catalogs;

        let missingFromDefault = await compareWithDefault(donemler, defaultCat);
        let allMissings = await compareOthers(missingFromDefault, otherCats);

        let log = await createLog(
          prepClass,
          totalCredit,
          isOk,
          failed,
          allMissings,
          catalogs
        );

        results.push({
          data: log,
          name: jsonArr[i].name,
          saveLocation: jsonArr[i].saveLocation,
        });
      }
      resolve(results);
    } catch (e) {
      reject(e);
    }
  });
};

var checkPrepClass = donemler => {
  return new Promise(resolve => {
    let prep = false;
    for (let i = 0; i < donemler.length; i++) {
      if (donemler[i].donemi == 0) {
        prep = true;
        break;
      }
    }
    resolve(prep);
  });
};

var checkTotalCredit = (semesters, prepClass) => {
  let totalCredit = 0;
  let res;
  semesters.forEach(semester => {
    totalCredit += semester.donem_akts_toplami;
  });

  prepClass ? (res = totalCredit == 270) : (res = totalCredit == 240);

  return { isOk: res, totalCredit: totalCredit };
};

var checkLectureSuccess = semesters => {
  return new Promise(resolve => {
    let unsuccessfulLects = [];
    let unknownSuccessStatus = [];

    semesters.forEach(semester => {
      let { dersler } = semester;
      for (let i = 0; i < dersler.length; i++) {
        if (dersler[i].basari_durumu == "Başarısız") {
          unsuccessfulLects.push(dersler[i]);
        } else if (dersler[i].basari_durumu === "") {
          unknownSuccessStatus.push(dersler[i]);
        }
      }
    });
    resolve({
      fails: unsuccessfulLects,
      unknowns: unknownSuccessStatus,
    });
  });
};

var getCatalogs = json => {
  return new Promise(async (resolve, reject) => {
    let department = json.data.ogrenci_bilgileri.programi
      .replaceAll(/\(.*\)/g, "")
      .trim();
    try {
      let otherCatalogs = [];
      let catalogs = await db.find(department);
      let { kataloglar } = catalogs;

      let defaultCat = kataloglar[catalogs.default];

      for (let i = 0; i < kataloglar.length; i++) {
        if (i == catalogs.default) continue;
        otherCatalogs.push(kataloglar[i]);
      }

      resolve({ defaultCat: defaultCat, otherCats: otherCatalogs });
    } catch (e) {
      reject(department);
    }
  });
};

var compareWithDefault = async (donemler, defaultCat) => {
  return new Promise(resolve => {
    let allCatalogLects = getAllCatLects(defaultCat);

    let missingLectures = [];

    donemler.forEach(donem => {
      let { dersler } = donem;
      for (let i = 0; i < dersler.length; i++) {
        let pdfDersKodu = dersler[i].ders_kodu.replaceAll("*", "");
        let pdfAkts = dersler[i].akts;

        let found = allCatalogLects.find(lect => pdfDersKodu == lect.ders_kodu);

        found || (pdfAkts != "30" && missingLectures.push(dersler[i]));
      }
    });
    resolve(missingLectures);
  });
};

var compareOthers = async (lects, otherCats) => {
  return new Promise(resolve => {
    let missings = [];
    let len = lects.length;

    mainloop: for (var i = 0; i < otherCats.length; i++) {
      let catalogLects = getAllCatLects(otherCats[i]);

      for (var j = 0; j < lects.length; j++) {
        let pdfDersKodu = lects[j].ders_kodu.replaceAll("*", "");
        let found = catalogLects.find(lect => pdfDersKodu == lect.ders_kodu);

        found && len--;

        if (
          found == undefined &&
          (missings.length == 0 || missings[missings.length - 1] != lects[j])
        ) {
          missings.push(lects[j]);
        }

        if (len == 0) break mainloop;
      }
    }
    resolve(missings);
  });
};

var getAllCatLects = catalog => {
  let semesters = [];
  for (let i = 1; true; i++) {
    if (!catalog[`_${i}`]) break;

    let semester = catalog[`_${i}`];
    semesters.push(semester.d0.donem_dersleri);
    semesters.push(semester.d1.donem_dersleri);
  }

  let allCatalogLects = semesters.flatMap(semester => {
    if (semester.secmeli) return [...semester.zorunlu, ...semester.secmeli];
    else return [...semester.zorunlu];
  });
  return allCatalogLects;
};

var createLog = async (
  prepClass,
  totalCredit,
  isOk,
  failed,
  allMissings,
  catalogs
) => {
  return new Promise(resolve => {
    let generalRes =
      !isOk || failed.fails.length
        ? "* Mezuniyet şartları sağlanmadı: "
        : "* Mezuniyet şartları sağlandı.";

    if (!isOk) {
      generalRes += "kredi tamamlanmadı, ";
    }
    if (failed.fails.length) {
      generalRes += "başarısız dersler var";
    }

    let creditOkText = "\n* Akts sağlandı: " + (isOk ? "evet\n" : "hayır\n");
    let prepText = "* Hazırlık: " + (prepClass ? "evet\n" : "hayır\n");
    let creditText =
      "* Toplam alınan akts: " +
      (prepClass
        ? `${totalCredit - 30} + 30(Hazırlık sınıfı)\n`
        : `${totalCredit}\n`);

    let failedLectsText = "* Başarısız dersler:\n\n";
    let fails = "";

    if (failed.fails && failed.fails.length) {
      fails = createLectText(failed.fails);
    } else fails = "\tBaşarısız ders yok!\n";

    let unknownResText = "* Sonucu bilinmeyen dersler:\n\n";
    let unknowns = "";
    if (failed.unknowns && failed.unknowns.length) {
      generalRes += " (SONUCU BİLİNMEYEN DERSLER VAR!)";
      unknowns = createLectText(failed.unknowns);
    } else unknowns = "\tSonucu bilinmeyen ders yok!\n";

    let missingsText = "* Kataloglarda bulunamayan dersler:\n\n";
    let missings = "";
    if (allMissings.length) {
      missings = createLectText(allMissings);
    } else missings = "\tTüm dersler bulundu!\n";

    let defaultCatText =
      `* Varsayılan ders kataloğu:\n` +
      `\t${catalogs.defaultCat.programi}(${catalogs.defaultCat.yil})\n`;

    let others = "* Kullanılan diğer kataloglar: \n";
    let otherCatalogsText = "";
    if (catalogs.otherCats) {
      catalogs.otherCats.forEach(cat => {
        otherCatalogsText += `\t${cat.programi}(${cat.yil})\n`;
      });
    } else otherCatalogsText = "Kullanılan başka katalog yok!";

    let res =
      generalRes +
      creditOkText +
      prepText +
      creditText +
      defaultCatText +
      others +
      otherCatalogsText +
      missingsText +
      missings +
      failedLectsText +
      fails +
      unknownResText +
      unknowns;

    resolve(res);
  });
};

var createLectText = lects => {
  let res = "";
  lects.forEach(lect => {
    res +=
      `\tDers kodu: ${lect.ders_kodu}\n\tDers adı: ${lect.ders_adi}\n\t` +
      `Ders tipi: ${lect.ders_tipi}\n\tAldığı dönem: ${lect.aldigi_donem}\n\tKredi: ${lect.k}\n\t` +
      `Akts: ${lect.akts}\n\tNot: ${lect.not}\n\tKat sayı: ${lect.ks}\n\t` +
      `Puan: ${lect.puan}\n\tBaşarı durumu: ${lect.basari_durumu}\n${constants.SEPERATOR}\n`;
  });
  return res;
};

module.exports = { checkGraduation };
