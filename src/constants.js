exports.SEPERATOR =
  "-------------------------------------------------------------------------";

exports.FG_COLORS = {
  black: "\033[38:5;0m",
  white: "\033[38;5;15m",
  grey: "\033[48;5;242m",
  red: "\033[38;5;1m",
  brightRed: "\033[38;5;9m",
  orange: "\033[38;5;208m",
  green: "\033[38;5;2m",
  yellow: "\033[38;5;11m",
  blue: "\033[38;5;4m",
  lightblue: "\033[38;5;69m",
};

exports.BG_COLORS = {
  black: "\033[48:5;0m",
  white: "\033[48;5;15m",
  grey: "\033[48;5;242m",
  red: "\033[48;5;1m",
  brightRed: "\033[48;5;9m",
  orange: "\033[48;5;160m",
  green: "\033[48;5;2m",
  yellow: "\033[48;5;11m",
  blue: "\033[48;5;4m",
  lightblue: "\033[48;5;69m",
};

exports.FONT_STYLES = {
  underlinedBold: "\x1b[4;1m",
  underline: "\x1b[4m",
  underlineOff: "\x1b[24m",
  bold: "\x1b[1m",
  boldOff: "\x1b[21m",
  resetColor: "\033[39m",
  resetAll: "\x1b[0m",
};

//jsonGenerator constants
exports.LECTURE_KEYS = [
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

exports.FUNC_NAMES = [
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
];

exports.INVALID_ERR_MES =
  "Dosyalar arasinda gecerli bir transkript bulunamadi!";

exports.PATH_ERR = "Girilen yol bir dosya veya dizine ait degil!";

exports.SKIP_FOLDER_MES = "Dizin bulundu, atlaniyor";

exports.RES_ERR = "Dosyada 'genel toplam' bulunamadi!";

exports.DOC_DATE_ERR = `Dosyada 'belge tarihi' bulunamadi, cikti tarih icermeyecek!`;

//command service constants

exports.CLI_EXAMPLES = [
  [
    "transkript2json gen ~/girdi",
    "*Pdf'den json uretir, girdi yoluna kayit eder.",
  ],
  [
    "transkript2json gen ~/girdi /cikti",
    "*Pdf'den json uretir, cikti yoluna kayit eder.",
  ],
  [
    "transkript2json chk ~/girdi",
    "*Girdi(yi/leri) varsayilan kataloga gore kontrol eder, diger kataloglar bulunamayan dersler icin kullanilir.",
  ],
];

exports.FLAGS = {
  debug: {
    alias: "d",
    describe: "Debug modunda calistir, calisma raporu olusturulur.",
    boolean: true,
  },
};

exports.DEVELOPER_INFO =
  "\033[38;5;190m***********************************\n* Developer info:                 * \n*         Ertugrul Yakin          *\n*" +
  " https://ertugrulyakin.engineer/ *\n***********************************\033[39m";

// Config constants

exports.MAIN_OPTS = ["Ders katalogu islemleri", "Ayarlari sifirla"];

exports.LECTURE_CAT_OPTS = [
  "Ekle",
  "Sil",
  "Goruntule",
  "Varsayilan Sec",
  "Ust menu",
];

exports.DEL_DB_WARN =
  "Tum veri tabani silinecek! \n* Indirilen ders kataloglari,\n* Eklenen url'ler, \n* Url transkript iliskilendirmeleri," +
  "\n* Url iliskili transkript parametreleri\n--> Iptal etmek icin 'h'ye basin...";

exports.DB_CLEAR_INFO =
  "Veri tabani temizlendi, kontrol islemi yapmak icin yeni url ekleyin...";

exports.SURE_QUEST = "Devam etmek istediginize emin misiniz? [e/h] ";

exports.RELATE_PDF = "Transkript ile iliskilendirilecek baska bir url? [e/h]";

//scraper constants
exports.URI_ERR = "Belge alinamadi!";
exports.PATH_ERR = "Adres bir pdf dosyasina ait degil veya yok!";
exports.PATH_QUEST = "İliskilendirilecek transkript yolu: ";
exports.DEPARTMENT_ERR = "Transkriptte ogrenci bolumu bulunamadi!";
exports.PARSE_LECT_ERR =
  "Ders bilgileri alinamadi, dogru bir url girdiginize emin olun!";
exports.DEP_MATCH_ERR =
  "Pdf bolumu ile url bolumu eslesmiyor, yine de devam edilsin mi? [e/h]";
exports.PRESS_ENTER = "Devam etmek icin enter tusuna basin";
exports.GO_BACK_MENU = "Menuye donmek icin enter tusuna basin";
exports.DB_NOT_FOUND = "Veri tabani bos veya bulunamadi!";
exports.DB_EXP =
  "Varsayilan secilmediyse, secmeli dersler ve kredileri icin eklenen ilk katalog kullanilacaktir.";
exports.DB_CREATE_ERR =
  "Veritabani olusturulurken dizin veya dosya hatasi olustu!";

// fileService constants
exports.UNLINK_ERR = "Dosya silinirken bir hata olustu!";
