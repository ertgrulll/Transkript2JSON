const promptService = require("./services/promptService");
const constants = require("./constants");
const fileService = require("./services/fileService");
const jsonGenerator = require("./jsonGenerator");
const scraper = require("./services/scraper");
const { Database } = require("./database");

const { remote, app } = require("electron");
const process = remote.getGlobal("process");

const Logger = require("./services/logService");
const logger = new Logger.Logger();

class Configs {
  init = async retry => {
    retry && logger.log(Logger.INFO, "Gecerli bir secenek secilmedi!");
    try {
      this.db = new Database();
      await this.db.init();
    } catch (e) {
      logger.log(Logger.ERROR, e);
      await await promptService.askToContinue(constants.PRESS_ENTER);
      logger.clearCli();
    }

    let selection = await promptService.askOption(
      "İslem seciniz: ",
      constants.MAIN_OPTS
    );

    logger.clearCli();

    switch (selection) {
      case 0:
        this.#linkTransactions();
        break;
      case 1:
        this.#dropDatabase();
        break;
      default:
        this.init(true);
        break;
    }
  };

  #linkTransactions = async retry => {
    retry && logger.log(Logger.INFO, "Gecerli bir secenek secilmedi!");

    let selection = await promptService.askOption(
      "İslem seciniz: ",
      constants.LECTURE_CAT_OPTS
    );
    logger.clearCli();

    switch (selection) {
      case 0:
        this.#addCatLink();
        break;
      case 1:
        this.#remove();
        break;
      case 2:
        this.#showDbContent();
        break;
      case 3:
        this.#selectDefault();
        break;
      case 4:
        this.init();
        break;

      default:
        this.#linkTransactions(true);
        break;
    }
  };

  #remove = async () => {
    let { selection, opts } = await this.#showDepartmentOpts(
      "Sil Menusu",
      "Secim"
    );

    try {
      await this.db.remove(opts[selection]);
      logger.clearCli();
      logger.log(Logger.INFO, `${opts[selection]} silindi!`);
      await promptService.askToContinue(constants.GO_BACK_MENU);
      logger.clearCli();
      this.#linkTransactions();
    } catch (e) {
      logger.log(e);
      await promptService.askToContinue(constants.PRESS_ENTER);
    }
  };

  #showDbContent = async () => {
    let contents = await this.db.findAll();
    if (!contents.length) {
      logger.log(Logger.ERROR, constants.DB_NOT_FOUND);
    }

    contents.forEach(content => {
      logger.print(
        `Egitim birimi: ${content.egitim_birimi}\nProgram: ${content.programi}`
      );
      logger.log(Logger.INFO, "\tİliskilendirilmis ders kataloglari:");
      content.kataloglar.forEach(cat => {
        logger.print(
          `\tKatalog programi: ${cat.programi}\n\tYil: ${cat.yil}\n\tUrl: ${cat.url}`
        );
        logger.print("\t" + constants.SEPERATOR);
      });
      logger.log(Logger.INFO, constants.SEPERATOR);
    });
    await promptService.askToContinue(constants.GO_BACK_MENU);
    logger.clearCli();
    this.#linkTransactions();
  };

  #dropDatabase = async _ => {
    logger.log(Logger.INFO, constants.DEL_DB_WARN);
    let eh = await promptService.askChar(constants.SURE_QUEST);

    if (eh == true) {
      logger.log(Logger.WARN, constants.DB_CLEAR_INFO);
      try {
        let dbPath = this.db.getDbPath();
        await fileService.deleteFolder(dbPath);
      } catch (e) {
        logger.log(Logger.ERROR, e);
      }
      await promptService.askToContinue(constants.GO_BACK_MENU);
    }
    logger.clearCli();
    this.init();
  };

  #addCatLink = async () => {
    logger.log(Logger.WARN, constants.DB_EXP);
    logger.log(Logger.INFO, "Cikmak icin exit yazin");

    let res = {};
    let pdfDepartment;
    res["kataloglar"] = [];
    res["default"] = 0;
    let isValid = false;

    while (!isValid) {
      try {
        let { department, faculty } = await this.#getPdfInfo();
        pdfDepartment = department.trim();

        logger.clearCli();
        logger.log(Logger.INFO, ` Transkript egitim birimi: ${faculty}`);
        logger.log(Logger.INFO, ` Transkript programi: ${department}`);

        res["programi"] = pdfDepartment;
        res["egitim_birimi"] = faculty.trim();

        isValid = true;
      } catch (e) {
        logger.log(Logger.ERROR, e);
        isValid = false;
      }
    }

    while (true) {
      let url, catalog;
      try {
        let res = await this.#getDoc();
        url = res.url;
        catalog = res.catalog;
      } catch (e) {
        logger.print(e);
      }

      logger.log(Logger.INFO, `Katalog programi: ${catalog.programi}`);
      logger.log(Logger.INFO, `Katalog yili: ${catalog.yil}`);

      if (
        pdfDepartment !== catalog.programi.trim() &&
        !(await promptService.askChar(constants.DEP_MATCH_ERR))
      ) {
        logger.clearCli();
        this.init();
        break;
      }

      catalog["url"] = url;
      res["kataloglar"].push(catalog);
      if (!(await promptService.askChar(constants.RELATE_PDF))) {
        try {
          await this.db.insert(res, res.programi);
        } catch (e) {
          logger.log(Logger.ERROR, e);
          process.exit(0);
          app.exit(0);
        }

        logger.log(Logger.INFO, "Eklendi!");
        await promptService.askToContinue(constants.PRESS_ENTER);
        logger.clearCli();
        this.#linkTransactions();
        break;
      }
    }
  };

  #getPdfInfo = async _ => {
    return new Promise(async (resolve, reject) => {
      let pdfPath = await promptService.ask(constants.PATH_QUEST);
      pdfPath == "exit" && logger.clearCli() && process.exit(0) && app.exit(0);

      let { is, absPath } = await fileService.validatePdf(pdfPath);
      !is && reject(constants.PATH_ERR);

      try {
        let department, faculty;
        let pdfDocument = await jsonGenerator.readPdf.f(absPath);
        let pages = await jsonGenerator.extractPages.f(pdfDocument);
        await jsonGenerator.checkFile.f(pages[0]);
        let { studentInfoObj } = await jsonGenerator.extractStudentInfo.f(
          pages[0]
        );
        department = studentInfoObj.programi.replaceAll(/\(.+\)/g, "").trim();
        faculty =
          studentInfoObj.egitim_birimi || studentInfoObj["egitim birimi"];

        resolve({ department: department, faculty: faculty });
      } catch (e) {
        reject(e);
      }
    });
  };

  #getDoc = async _ => {
    return new Promise(async (resolve, reject) => {
      let isHtmlDocValid = false;
      while (!isHtmlDocValid) {
        try {
          let url = await promptService.ask("Url: ");
          url == "exit" && logger.clearCli() && process.exit(0) && app.exit(0);

          let catalogJson = await scraper.getCatalog(url);

          resolve({ catalog: catalogJson, url: url });
          isHtmlDocValid = true;
        } catch (e) {
          reject(e);
          isHtmlDocValid = false;
        }
      }
    });
  };

  #selectDefault = async () => {
    let { selection, opts } = await this.#showDepartmentOpts(
      "Program Listesi",
      "Secim"
    );

    let db = await this.db.find(opts[selection]);
    logger.clearCli();
    let { yil, programi } = db.kataloglar[db.default];

    logger.log(
      Logger.WARN,
      `${opts[selection]} varsayilan katalog: ${programi}(${yil})`
    );

    let { selectedOpt, opt } = await this.#showCatalogOpts(
      opts[selection],
      `${opts[selection]} Katalog Listesi`,
      "Varsayilan secin"
    );

    let id = opts[selection].replaceAll(/\(.*\)/g, "");

    try {
      await this.db.setDefault(id, selectedOpt);
      logger.log(
        Logger.INFO,
        `${id} varsayilani ${opt[selectedOpt]} ders katalogu olarak ayarlandi.`
      );
    } catch (e) {
      logger.print(e);
    }

    await promptService.askToContinue(constants.GO_BACK_MENU);
    logger.clearCli();
    this.#linkTransactions();
  };

  #showDepartmentOpts = async (header, mes) => {
    return new Promise(async resolve => {
      mes && logger.log(Logger.INFO, header);
      let opts = [];

      let contents = await this.db.findAll();

      if (!contents.length) {
        logger.log(Logger.ERROR, constants.DB_NOT_FOUND);
      }
      contents.forEach(content => {
        opts.push(content.programi);
      });
      opts.push("Ust menu");
      let selection = await promptService.askOption(mes, opts);
      if (selection == opts.length - 1) {
        logger.clearCli();
        this.#linkTransactions();
        return;
      }
      resolve({ selection: selection, opts: opts });
    });
  };

  #showCatalogOpts = async (id, header, mes) => {
    return new Promise(async resolve => {
      mes && logger.log(Logger.INFO, header);
      let opts = [];

      let content = await this.db.find(id);
      if (!content) {
        logger.log(Logger.ERROR, constants.DB_NOT_FOUND);
      }

      content.kataloglar.forEach(cat => {
        opts.push(`${cat.programi}(${cat.yil})`);
      });

      opts.push("Ust menu");
      let selection = await promptService.askOption(mes, opts);
      if (selection == opts.length - 1) {
        logger.clearCli();
        this.#linkTransactions();
        return;
      }
      resolve({ selectedOpt: selection, opt: opts });
    });
  };
}

module.exports = { Configs };
