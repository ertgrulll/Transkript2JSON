const os = require("os");
const path = require("path");
const fs = require("fs");
const Datastore = require("nedb");
const constants = require("./constants");
const Logger = require("./services/logService");
const logger = new Logger.Logger();

class Database {
  constructor(name) {
    this.dbPath = path.join(os.homedir(), "T2J_DB");
    this.dbName = path.join(this.dbPath, name || "catalogs");
  }

  init = async () => {
    return new Promise((resolve, reject) => {
      try {
        if (!fs.existsSync(this.dbPath)) {
          fs.mkdir(this.dbPath, err => {
            if (err) logger.log(err);
          });
        }
        this.db = new Datastore({
          filename: this.dbName,
          autoload: true,
        });
        resolve(true);
      } catch (e) {
        reject(constants.DB_CREATE_ERR + e);
      }
    });
  };

  getDbPath = () => {
    return this.dbPath;
  };

  insert = async (doc, id) => {
    id ? (doc["_id"] = id) : "";
    return new Promise((resolve, reject) => {
      this.db.insert(doc, function (err) {
        if (err) {
          reject(
            `${id} daha once eklenmis, tekrar eklenemez! Duzenleme islemini yazmaya usendim, once silin :)`
          );
        } else {
          resolve(true);
        }
      });
    });
  };

  find = id => {
    return new Promise((resolve, reject) => {
      this.db.findOne({ _id: id }, function (err, doc) {
        if (err) {
          reject("Kayit bulunamadi!");
        } else resolve(doc);
      });
    });
  };

  findAll = _ => {
    return new Promise((resolve, reject) => {
      this.db.find({}, (err, docs) => {
        if (err) {
          reject(constants.DB_NOT_FOUND + err);
        } else resolve(docs);
      });
    });
  };

  remove = async id => {
    return new Promise((resolve, reject) => {
      try {
        this.db.remove({ _id: id }, (err, numRemoved) => {
          if (err) logger.log(Logger.ERROR, err);
          resolve(numRemoved);
        });
      } catch (e) {
        reject(e);
      }
    });
  };

  setDefault = async (id, index) => {
    return new Promise(async (resolve, reject) => {
      this.db.update(
        { _id: id.trim() },
        { $set: { default: index } },
        { multi: true },
        function (err, numReplaced) {
          if (err) reject("Guncelleme hatasi!");
          else resolve(numReplaced);
        }
      );
    });
  };
}

module.exports = { Database };
