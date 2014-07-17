var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

window.Box = (function() {
  var columnValues;

  function Box() {
    this.rowTotals = __bind(this.rowTotals, this);
    this.rowColumnValues = __bind(this.rowColumnValues, this);
    this.rows = [];
    this.rowByHash = {};
  }

  Box.prototype.addRow = function(item) {
    var row;
    if (this.rowByHash[item]) {
      return;
    }
    row = {
      columns: {},
      totals: {}
    };
    this.rows.push(row);
    return this.rowByHash[item] = row;
  };

  Box.prototype.setColumns = function(columns, valueTypes) {
    return Lazy(this.rows).each(function(row) {
      Lazy(columns).each(function(colValue) {
        var column;
        column = row['columns'][colValue] = {};
        column['values'] = {};
        return Lazy(valueTypes).each(function(type) {
          var _base;
          return (_base = column['values'])[type] != null ? _base[type] : _base[type] = new BigNumber(0);
        });
      });
      return Lazy(valueTypes).each(function(type) {
        return row['totals'][type] = new BigNumber(0);
      });
    });
  };

  Box.prototype.setValues = function(row, col, type, value) {};

  Box.prototype.addToValue = function(row, col, type, value) {
    var column;
    if (!row) {
      return;
    }
    if (!this.rowByHash[row]) {
      console.log("missing item", row);
      return;
    }
    column = this.rowByHash[row]['columns'][col];
    column['values'][type] = column['values'][type].plus(value);
    return this.rowByHash[row]['totals'][type] = this.rowByHash[row]['totals'][type].plus(value);
  };

  Box.prototype.columnAmount = function() {
    return this.rows[0]['values'].length;
  };

  Box.prototype.rowColumnValues = function(row) {
    if (!this.rowByHash[row]) {
      return [];
    }
    return Lazy(this.rowByHash[row]['columns']).pairs().map(function(item) {
      return {
        column: item[0],
        values: item[1].values
      };
    }).toArray();
  };

  Box.prototype.rowTotals = function(row) {
    if (!this.rowByHash[row]) {
      return {
        amount: new BigNumber(0)
      };
    }
    return this.rowByHash[row]['totals'];
  };

  columnValues = function(column) {
    if (column.blank != null) {
      return 0;
    }
    return column['values'] || 0;
  };

  return Box;

})();

var Syncable,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Syncable = (function() {
  function Syncable() {
    this.onModified = __bind(this.onModified, this);
    this.onDelete = __bind(this.onDelete, this);
    this.onEdit = __bind(this.onEdit, this);
    this.onInsert = __bind(this.onInsert, this);
    this.reset = __bind(this.reset, this);
    this.getAvailableId = __bind(this.getAvailableId, this);
  }

  Syncable.prototype.getAvailableId = function() {
    var currentTime;
    currentTime = moment().unix();
    if (this.lastIssuedId >= currentTime) {
      return this.lastIssuedId = this.lastIssuedId + 1;
    } else {
      return this.lastIssuedId = currentTime;
    }
  };

  Syncable.prototype.reset = function() {
    this.lastIssuedId = 0;
    this.updatedAt = 0;
    return this.actionsLog = [];
  };

  Syncable.prototype.onInsert = function(details) {
    this.actionsLog.push({
      action: 'insert',
      id: details.id,
      item: details
    });
    return this.onModified();
  };

  Syncable.prototype.onEdit = function(details) {
    this.actionsLog.push({
      action: 'update',
      id: details.id,
      item: details
    });
    return this.onModified();
  };

  Syncable.prototype.onDelete = function(itemId) {
    this.actionsLog.push({
      action: 'delete',
      id: itemId
    });
    return this.onModified();
  };

  Syncable.prototype.onModified = function() {
    return this.updatedAt = Date.now();
  };

  return Syncable;

})();

var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

window.Collection = (function(_super) {
  var VERSION;

  __extends(Collection, _super);

  VERSION = '1.0';

  function Collection($q, sortColumn) {
    this.afterLoadCollection = __bind(this.afterLoadCollection, this);
    this.$deleteItem = __bind(this.$deleteItem, this);
    this.$updateOrSet = __bind(this.$updateOrSet, this);
    this.$buildIndex = __bind(this.$buildIndex, this);
    this.correctId = __bind(this.correctId, this);
    this.reset = __bind(this.reset, this);
    this.length = __bind(this.length, this);
    this.deleteById = __bind(this.deleteById, this);
    this.editById = __bind(this.editById, this);
    this.insert = __bind(this.insert, this);
    this.sortLazy = __bind(this.sortLazy, this);
    this.$q = $q;
    this.sortColumn = sortColumn;
    this.reset();
  }

  Collection.doNotConvertFunc = function(item) {
    return item;
  };

  Collection.prototype.version = function() {
    return VERSION;
  };

  Collection.prototype.migrateIfNeeded = function(fromVersion) {};

  Collection.prototype.setItemExtendFunc = function(extendFunc) {
    return this.itemExtendFunc = extendFunc;
  };

  Collection.prototype.extendItem = function(item) {
    if (this.itemExtendFunc) {
      return this.itemExtendFunc(item);
    }
  };

  Collection.prototype.reExtendItems = function() {
    if (!this.itemExtendFunc) {
      return;
    }
    return this.collection.forEach((function(_this) {
      return function(item) {
        return _this.itemExtendFunc(item);
      };
    })(this));
  };

  Collection.prototype.findById = function(id) {
    var result;
    result = this.collection[this.idIndex[id]];
    if (result) {
      result = angular.copy(result);
    }
    return result;
  };

  Collection.prototype.findByIds = function(ids) {
    var result;
    if (!ids) {
      return [];
    }
    result = Lazy(ids).map((function(_this) {
      return function(id) {
        return _this.collection[_this.idIndex[id]];
      };
    })(this)).toArray();
    if (result) {
      result = angular.copy(result);
    }
    return result;
  };

  Collection.prototype.getAll = function(sortColumns) {
    var result;
    result = Lazy(angular.copy(this.collection));
    result = this.sortLazy(result, sortColumns);
    return result;
  };

  Collection.prototype.sortLazy = function(items, columns) {
    if (!columns && this.sortColumn) {
      columns = this.sortColumn;
    }
    if (columns) {
      if (columns instanceof Array && columns.length === 2) {
        return items.sortBy(function(item) {
          return [item[columns[0]], item[columns[1]]];
        });
      } else {
        return items.sortBy(function(item) {
          return item[columns];
        });
      }
    } else {
      return items;
    }
  };

  Collection.prototype.getItemsByYear = function(column, year, sortColumns) {
    var results;
    results = Lazy(this.collection).filter(function(item) {
      if (item[column] < 10000) {
        return item[column] === year;
      } else {
        return moment(item[column]).year() === year;
      }
    });
    return this.sortLazy(results, sortColumns);
  };

  Collection.prototype.insert = function(details) {
    var deferred, id;
    deferred = this.$q.defer();
    this.correctId(details);
    if (!details.id) {
      id = this.getAvailableId();
      details.id = id;
      details.createdAt = moment().valueOf();
      details.updatedAt = moment().valueOf();
      this.lastInsertedId = details.id;
    } else if (this.findById(details.id)) {
      deferred.reject("ID already exists");
      return;
    }
    if (this.itemExtendFunc) {
      this.itemExtendFunc(details);
    }
    this.collection.push(details);
    this.idIndex[details.id] = this.collection.length - 1;
    this.onInsert(details);
    deferred.resolve(details.id);
    return deferred.promise;
  };

  Collection.prototype.editById = function(details) {
    var deferred, index, item;
    deferred = this.$q.defer();
    this.correctId(details);
    index = this.idIndex[details.id];
    if (index === void 0) {
      throw 'not found';
    }
    item = this.collection[index];
    angular.copy(details, item);
    item.updatedAt = moment().valueOf();
    this.onEdit(details);
    deferred.resolve();
    return deferred.promise;
  };

  Collection.prototype.deleteById = function(itemId, loadingProcess) {
    if (this.idIndex[itemId] === void 0) {
      throw 'not found';
    }
    this.collection.splice(this.idIndex[itemId], 1);
    this.$buildIndex();
    if (!loadingProcess) {
      return this.onDelete(itemId);
    }
  };

  Collection.prototype.length = function() {
    return this.collection.length;
  };

  Collection.prototype.reset = function() {
    Collection.__super__.reset.apply(this, arguments);
    this.collection = [];
    this.lastInsertedId = null;
    return this.idIndex = {};
  };

  Collection.prototype.correctId = function(item) {
    if (item.id && typeof item.id !== 'number') {
      return item.id = parseInt(item.id, 10);
    }
  };

  Collection.prototype.$buildIndex = function() {
    var indexItem;
    indexItem = function(result, item, index) {
      result[item.id] = index;
      return result;
    };
    return this.idIndex = Lazy(this.collection).reduce(indexItem, {});
  };

  Collection.prototype.$updateOrSet = function(item, updatedAt) {
    this.correctId(item);
    if (this.idIndex[item.id] != null) {
      this.collection[this.idIndex[item.id]] = item;
    } else {
      this.collection.push(item);
      this.idIndex[item.id] = this.collection.length - 1;
    }
    this.extendItem(item);
    if (updatedAt > this.updatedAt) {
      return this.updatedAt = updatedAt;
    }
  };

  Collection.prototype.$deleteItem = function(itemId, updatedAt) {
    this.deleteById(itemId, true);
    if (updatedAt > this.updatedAt) {
      return this.updatedAt = updatedAt;
    }
  };

  Collection.prototype.afterLoadCollection = function() {
    this.collection.forEach((function(_this) {
      return function(item) {
        return _this.correctId(item);
      };
    })(this));
    this.$buildIndex();
    return this.migrateIfNeeded();
  };

  return Collection;

})(Syncable);

var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

window.IndexedDbCollection = (function(_super) {
  __extends(IndexedDbCollection, _super);

  function IndexedDbCollection(appName, collectionName) {
    this.afterLoadCollection = __bind(this.afterLoadCollection, this);
    this.$deleteItem = __bind(this.$deleteItem, this);
    this.$updateOrSet = __bind(this.$updateOrSet, this);
    this.beforeInsert = __bind(this.beforeInsert, this);
    this.reset = __bind(this.reset, this);
    this.deleteById = __bind(this.deleteById, this);
    this.updateById = __bind(this.updateById, this);
    this.findById = __bind(this.findById, this);
    this.getItemsCount = __bind(this.getItemsCount, this);
    this.getAll = __bind(this.getAll, this);
    this.clearAll = __bind(this.clearAll, this);
    this.insertMultiple = __bind(this.insertMultiple, this);
    this.insert = __bind(this.insert, this);
    this.getAvailableId = __bind(this.getAvailableId, this);
    this.collectionName = collectionName;
    this.appName = appName;
    this.reset();
  }

  IndexedDbCollection.prototype.getAvailableId = function() {
    var currentTime;
    currentTime = moment().unix();
    if (this.lastIssuedId >= currentTime) {
      return this.lastIssuedId = this.lastIssuedId + 1;
    } else {
      return this.lastIssuedId = currentTime;
    }
  };

  IndexedDbCollection.prototype.createDatabase = function(dbSchema, version) {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        if (!version) {
          version = 1;
        }
        return db.open({
          server: _this.appName,
          version: version,
          schema: dbSchema
        }).done(function(client) {
          _this.dba = client;
          return resolve();
        }).fail(function(err) {
          console.log(err);
          return fail();
        });
      };
    })(this));
  };

  IndexedDbCollection.prototype.insert = function(item, loadingProcess) {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        _this.beforeInsert(item);
        return _this.dba[_this.collectionName].add(item).then(function() {
          if (!loadingProcess) {
            _this.onInsert(item);
          }
          return resolve();
        }, reject);
      };
    })(this));
  };

  IndexedDbCollection.prototype.insertMultiple = function(items) {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        items.forEach(_this.beforeInsert);
        return _this.dba[_this.collectionName].add.apply(_this.dba, items).then(function() {
          items.forEach(function(item) {
            return _this.onInsert(item);
          });
          return resolve();
        }, reject);
      };
    })(this));
  };

  IndexedDbCollection.prototype.clearAll = function() {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        _this.reset();
        return _this.dba[_this.collectionName].clear().then(resolve, reject);
      };
    })(this));
  };

  IndexedDbCollection.prototype.getAll = function() {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        return _this.dba[_this.collectionName].query().all().execute().then(resolve, reject);
      };
    })(this));
  };

  IndexedDbCollection.prototype.getItemsCount = function() {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        return _this.dba.query(_this.collectionName, 'id').all().distinct().count().execute().then(resolve, reject);
      };
    })(this));
  };

  IndexedDbCollection.prototype.findById = function(id) {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        return _this.dba[_this.collectionName].query('id').only(id).execute().then(function(results) {
          return resolve(results[0]);
        }, reject);
      };
    })(this));
  };

  IndexedDbCollection.prototype.updateById = function(item, loadingProcess) {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        return _this.dba[_this.collectionName].update(item).then(function() {
          if (!loadingProcess) {
            _this.onEdit(item);
          }
          return resolve();
        }, reject);
      };
    })(this));
  };

  IndexedDbCollection.prototype.deleteById = function(item, loadingProcess) {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        return _this.dba[_this.collectionName].remove(item.id).then(function() {
          if (!loadingProcess) {
            _this.onDelete(item);
          }
          return resolve();
        }, reject);
      };
    })(this));
  };

  IndexedDbCollection.prototype.reset = function() {
    IndexedDbCollection.__super__.reset.apply(this, arguments);
    this.lastInsertedId = null;
    return this.updatedAt = 0;
  };

  IndexedDbCollection.prototype.beforeInsert = function(details) {
    var id;
    if (!details.id) {
      id = this.getAvailableId();
      details.id = id;
      details.createdAt = moment().valueOf();
      details.updatedAt = moment().valueOf();
      return this.lastInsertedId = details.id;
    }
  };

  IndexedDbCollection.prototype.$updateOrSet = function(item, updatedAt) {
    var promise;
    promise = null;
    return this.findById(item.id).then((function(_this) {
      return function(existingItem) {
        if (existingItem) {
          promise = _this.updateById(item.id, item, true);
        } else {
          promise = _this.insert(item, true);
        }
        if (updatedAt > _this.updatedAt) {
          _this.updatedAt = updatedAt;
        }
        return promise.then(function() {
          var a;
          return a = 1;
        }, function(err) {
          return console.log(err.stack);
        });
      };
    })(this), function(err) {
      console.log(err);
      return console.log(err.stack);
    });
  };

  IndexedDbCollection.prototype.$deleteItem = function(itemId, updatedAt) {
    var promise;
    promise = this.deleteById({
      id: itemId
    }, true);
    if (updatedAt > this.updatedAt) {
      this.updatedAt = updatedAt;
    }
    return promise;
  };

  IndexedDbCollection.prototype.afterLoadCollection = function() {};

  return IndexedDbCollection;

})(Syncable);

var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

window.SimpleCollection = (function() {
  var VERSION;

  VERSION = '1.0';

  function SimpleCollection($q) {
    this.afterLoadCollection = __bind(this.afterLoadCollection, this);
    this.$deleteItem = __bind(this.$deleteItem, this);
    this.$updateOrSet = __bind(this.$updateOrSet, this);
    this.$buildIndex = __bind(this.$buildIndex, this);
    this.reset = __bind(this.reset, this);
    this.correctId = __bind(this.correctId, this);
    this.onModified = __bind(this.onModified, this);
    this.findOrCreate = __bind(this.findOrCreate, this);
    this["delete"] = __bind(this["delete"], this);
    this.set = __bind(this.set, this);
    this.get = __bind(this.get, this);
    this.has = __bind(this.has, this);
    this.getAll = __bind(this.getAll, this);
    this.reExtendItems = __bind(this.reExtendItems, this);
    this.migrateIfNeeded = __bind(this.migrateIfNeeded, this);
    this.getAvailableId = __bind(this.getAvailableId, this);
    this.reset();
  }

  SimpleCollection.prototype.getAvailableId = function() {
    var currentTime;
    currentTime = moment().unix();
    if (this.lastIssuedId >= currentTime) {
      return this.lastIssuedId = this.lastIssuedId + 1;
    } else {
      return this.lastIssuedId = currentTime;
    }
  };

  SimpleCollection.prototype.version = function() {
    return VERSION;
  };

  SimpleCollection.prototype.migrateIfNeeded = function() {};

  SimpleCollection.prototype.reExtendItems = function() {};

  SimpleCollection.prototype.getAll = function() {
    return Lazy(this.actualCollection).keys();
  };

  SimpleCollection.prototype.has = function(key) {
    return !!this.actualCollection[key];
  };

  SimpleCollection.prototype.get = function(key) {
    if (!this.actualCollection[key]) {
      return void 0;
    }
    return angular.copy(this.actualCollection[key].value);
  };

  SimpleCollection.prototype.set = function(key, value, isLoadingProcess, loadedId) {
    var entry, item, newId;
    if (this.actualCollection[key]) {
      item = this.actualCollection[key];
      item.value = value;
      item = this.collection[this.idIndex[item.id]];
      item.value = value;
      if (!isLoadingProcess) {
        this.actionsLog.push({
          action: 'update',
          id: item.id,
          item: item
        });
      }
    } else {
      if (isLoadingProcess && loadedId) {
        newId = loadedId;
      } else {
        newId = this.getAvailableId();
      }
      this.actualCollection[key] = {
        id: newId,
        value: value
      };
      entry = {
        id: newId,
        key: key,
        value: value
      };
      this.collection.push(entry);
      if (!isLoadingProcess) {
        this.actionsLog.push({
          action: 'insert',
          id: newId,
          item: entry
        });
      }
      this.idIndex[newId] = this.collection.length - 1;
    }
    if (!isLoadingProcess) {
      return this.onModified();
    }
  };

  SimpleCollection.prototype["delete"] = function(key, isLoadingProcess) {
    var index, item;
    item = this.actualCollection[key];
    if (!item) {
      throw 'not found';
    }
    index = this.idIndex[item.id];
    if (index === void 0) {
      throw 'not found';
    }
    delete this.idIndex[item.id];
    this.collection.splice(index, 1);
    delete this.actualCollection[key];
    if (!isLoadingProcess) {
      this.actionsLog.push({
        action: 'delete',
        id: item.id
      });
      return this.onModified();
    }
  };

  SimpleCollection.prototype.findOrCreate = function(items) {
    if (!items) {
      return;
    }
    if (!(items instanceof Array)) {
      items = [items];
    }
    if (!items[0]) {
      return;
    }
    return items.forEach((function(_this) {
      return function(item) {
        return _this.set(item, true);
      };
    })(this));
  };

  SimpleCollection.prototype.onModified = function() {
    return this.updatedAt = Date.now();
  };

  SimpleCollection.prototype.correctId = function(item) {
    if (item.id && typeof item.id !== 'number') {
      return item.id = parseInt(item.id, 10);
    }
  };

  SimpleCollection.prototype.reset = function() {
    this.idIndex = {};
    this.collection = [];
    this.actualCollection = {};
    this.actionsLog = [];
    this.updatedAt = 0;
    return this.lastIssuedId = 0;
  };

  SimpleCollection.prototype.$buildIndex = function() {
    var indexItem;
    indexItem = function(result, item, index) {
      result[item.id] = index;
      return result;
    };
    return this.idIndex = Lazy(this.collection).reduce(indexItem, {});
  };

  SimpleCollection.prototype.$updateOrSet = function(item, updatedAt) {
    this.correctId(item);
    this.set(item.key, item.value, true, item.id);
    if (updatedAt > this.updatedAt) {
      return this.updatedAt = updatedAt;
    }
  };

  SimpleCollection.prototype.$deleteItem = function(itemId, updatedAt) {
    this["delete"](itemId, true);
    if (updatedAt > this.updatedAt) {
      return this.updatedAt = updatedAt;
    }
  };

  SimpleCollection.prototype.afterLoadCollection = function() {
    var items;
    if (this.collection instanceof Array) {
      this.collection.forEach((function(_this) {
        return function(item) {
          return _this.correctId(item);
        };
      })(this));
      this.$buildIndex();
      return this.collection.forEach((function(_this) {
        return function(item) {
          return _this.actualCollection[item.key] = {
            id: item.id,
            value: item.value
          };
        };
      })(this));
    } else {
      items = this.collection;
      this.collection = [];
      Lazy(items).keys().each((function(_this) {
        return function(key) {
          return _this.set(key, items[key]);
        };
      })(this));
      return this.actionsLog = [];
    }
  };

  return SimpleCollection;

})();

var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

window.Database = (function() {
  function Database(appName, $q, storageService, userService) {
    this.saveTables = __bind(this.saveTables, this);
    this.performReadData = __bind(this.performReadData, this);
    this.performGetLastModified = __bind(this.performGetLastModified, this);
    this.readTablesFromWeb = __bind(this.readTablesFromWeb, this);
    this.applyActions = __bind(this.applyActions, this);
    this.authenticate = __bind(this.authenticate, this);
    this.dumpAllCollections = __bind(this.dumpAllCollections, this);
    this.collectionToStorage = __bind(this.collectionToStorage, this);
    this.writeTablesToFS = __bind(this.writeTablesToFS, this);
    this.readTablesFromFS = __bind(this.readTablesFromFS, this);
    this.createAllFiles = __bind(this.createAllFiles, this);
    this.createCollection = __bind(this.createCollection, this);
    this.$q = $q;
    this.storageService = storageService;
    this.appName = appName;
    this.userService = userService;
    this.db = {};
    this.user = storageService.getUserDetails();
  }

  Database.prototype.createCollection = function(name, collectionInstance) {
    this.db[name] = collectionInstance;
    return collectionInstance;
  };

  Database.prototype.fileName = function(userId, tableName) {
    return "" + userId + "-" + this.appName + "-" + tableName + ".json";
  };

  Database.prototype.createAllFiles = function(tableNames) {
    var promises;
    promises = tableNames.map((function(_this) {
      return function(tableName) {
        return _this.storageService.writeFileIfNotExist(_this.fileName(_this.user.id, tableName), "");
      };
    })(this));
    return this.$q.all(promises);
  };

  Database.prototype.readTablesFromFS = function(tableNames) {
    var promises;
    promises = tableNames.map((function(_this) {
      return function(tableName) {
        if (_this.db[tableName].collection.length > 0) {
          return null;
        }
        return _this.storageService.readFile(_this.fileName(_this.user.id, tableName)).then(function(content) {
          var dbModel;
          if (!content) {
            return;
          }
          content = JSON.parse(content);
          dbModel = _this.db[tableName];
          if (!content.version) {
            console.log('failed to load ' + tableName + ' - version missing');
            return;
          }
          dbModel.updatedAt = content.updatedAt;
          dbModel.collection = content.data;
          dbModel.afterLoadCollection();
          return dbModel.reExtendItems();
        });
      };
    })(this));
    return this.$q.all(promises).then(function() {
      return console.log('read data sets ', tableNames, ' from file system - resolving');
    });
  };

  Database.prototype.writeTablesToFS = function(tableNames) {
    var promises;
    promises = tableNames.map((function(_this) {
      return function(tableName) {
        return _this.storageService.writeFile(_this.fileName(_this.user.id, tableName), angular.toJson(_this.collectionToStorage(tableName))).then(function() {
          return console.log('write', tableName, 'to FS');
        }, function(err) {
          return console.log('failed to write', tableName, 'to FS', err);
        });
      };
    })(this));
    return this.$q.all(promises);
  };

  Database.prototype.collectionToStorage = function(tableName) {
    var dbModel;
    dbModel = this.db[tableName];
    return {
      version: dbModel.version(),
      data: dbModel.collection,
      updatedAt: dbModel.updatedAt
    };
  };

  Database.prototype.dumpAllCollections = function(tableList) {
    var result;
    result = {};
    result[this.appName] = Lazy(tableList).map((function(_this) {
      return function(tableName) {
        return {
          name: tableName,
          content: _this.collectionToStorage(tableName)
        };
      };
    })(this)).toArray();
    return result;
  };

  Database.prototype.authenticate = function() {
    var defer;
    defer = this.$q.defer();
    this.userService.checkLogin().then((function(_this) {
      return function(response) {
        _this.storageService.setUserDetails(response.data.user);
        return defer.resolve();
      };
    })(this), function(response) {
      return defer.reject({
        data: response.data,
        status: response.status,
        headers: response.headers
      });
    });
    return defer.promise;
  };

  Database.prototype.applyActions = function(tableName, dbModel, actions) {
    var lastUpdatedAt;
    lastUpdatedAt = 0;
    dbModel.actionsLog = [];
    actions.forEach((function(_this) {
      return function(op) {
        var err;
        if (op.action === 'update') {
          try {
            dbModel.$updateOrSet(JSON.parse(sjcl.decrypt(_this.storageService.getEncryptionKey(), op.item)), op.updatedAt);
          } catch (_error) {
            err = _error;
            console.log('failed to decrypt', tableName, op, err);
            throw 'failed to decrypt';
          }
        } else if (op.action === 'delete') {
          dbModel.$deleteItem(op.id, op.updatedAt);
        }
        return lastUpdatedAt = op.updatedAt;
      };
    })(this));
    return lastUpdatedAt;
  };

  Database.prototype.readTablesFromWeb = function(tableList, forceLoadAll) {
    if (forceLoadAll) {
      return this.performReadData(tableList, forceLoadAll);
    } else {
      return this.performGetLastModified(tableList, forceLoadAll);
    }
  };

  Database.prototype.performGetLastModified = function(tableList, forceLoadAll) {
    return this.userService.getLastModified().then((function(_this) {
      return function(response) {
        _this.storageService.setLastModifiedDateRaw(response.data.lastModifiedDate);
        return _this.performReadData(tableList, forceLoadAll);
      };
    })(this));
  };

  Database.prototype.performReadData = function(tableList, forceLoadAll) {
    var promises, staleTableList;
    staleTableList = [];
    tableList.forEach((function(_this) {
      return function(tableName) {
        var lastModifiedServerTime, lastSyncDate;
        if (forceLoadAll) {
          return staleTableList.push({
            name: tableName,
            getFrom: 0
          });
        } else {
          lastModifiedServerTime = _this.storageService.getLastModifiedDate(_this.appName, tableName);
          lastSyncDate = _this.storageService.getLocalLastSyncDate(_this.appName, tableName);
          if (lastModifiedServerTime && lastModifiedServerTime > lastSyncDate) {
            return staleTableList.push({
              name: tableName,
              getFrom: lastSyncDate
            });
          }
        }
      };
    })(this));
    promises = [];
    staleTableList.forEach((function(_this) {
      return function(table) {
        var dbModel, getDataFrom, promise, tableName;
        tableName = table.name;
        getDataFrom = table.getFrom;
        dbModel = _this.db[tableName];
        promise = _this.userService.readData(_this.appName, tableName, getDataFrom).then(function(response) {
          var err, lastUpdatedAt;
          try {
            if (forceLoadAll) {
              dbModel.reset();
            }
            if (response.data.actions.length > 0) {
              lastUpdatedAt = _this.applyActions(tableName, dbModel, response.data.actions);
              _this.storageService.setLocalLastSyncDate(_this.appName, tableName, lastUpdatedAt);
              return _this.storageService.setLastModifiedDate(_this.appName, tableName, lastUpdatedAt);
            }
          } catch (_error) {
            err = _error;
            console.log("error updating " + tableName + " after getting response from web");
            throw err;
          }
        });
        return promises.push(promise);
      };
    })(this));
    return this.$q.all(promises).then((function(_this) {
      return function(actions) {
        staleTableList = staleTableList.map(function(table) {
          return table.name;
        });
        _this.writeTablesToFS(staleTableList);
        if (staleTableList.length > 0) {
          return console.log('stale data sets ', staleTableList, ' were updated from the web - resolving');
        }
      };
    })(this), (function(_this) {
      return function(fail) {
        console.log('failed to read tables. Error: ', fail);
        return fail;
      };
    })(this));
  };

  Database.prototype.performGet = function(tableList, options) {
    var defer, onFailedReadTablesFromFS;
    defer = this.$q.defer();
    onFailedReadTablesFromFS = (function(_this) {
      return function(failures) {
        console.log('failed to read from fs: ', failures);
        return _this.readTablesFromWeb(tableList).then(function() {
          return defer.resolve();
        }, function(response) {
          return defer.reject(response);
        });
      };
    })(this);
    if (!this.user || !this.user.id) {
      console.log('missing user');
      defer.reject({
        data: {
          reason: 'not_logged_in'
        },
        status: 403
      });
    } else if (!this.storageService.getEncryptionKey()) {
      console.log('missing encryption key');
      defer.reject({
        data: {
          reason: 'missing_key'
        },
        status: 403
      });
    } else if (options.initialState === 'readFromWeb') {
      this.readTablesFromWeb(tableList, options.forceRefreshAll).then(function() {
        return defer.resolve();
      }, function(response) {
        return defer.reject(response);
      });
    } else if (options.initialState === 'readFromFS') {
      this.readTablesFromFS(tableList).then(angular.noop, onFailedReadTablesFromFS).then(function() {
        return defer.resolve();
      }, function(err) {
        return defer.reject(err);
      });
    }
    return defer.promise;
  };

  Database.prototype.authAndCheckData = function(tableList) {
    return this.performGet(tableList, {
      initialState: 'readFromWeb',
      forceRefreshAll: false
    });
  };

  Database.prototype.getTables = function(tableList, forceRefreshAll) {
    if (forceRefreshAll == null) {
      forceRefreshAll = false;
    }
    if (forceRefreshAll) {
      return this.performGet(tableList, {
        initialState: 'readFromWeb',
        forceRefreshAll: true
      });
    } else {
      return this.performGet(tableList, {
        initialState: 'readFromFS',
        forceRefreshAll: false
      });
    }
  };

  Database.prototype.saveTables = function(tableList, forceServerCleanAndSaveAll) {
    var promises;
    if (forceServerCleanAndSaveAll == null) {
      forceServerCleanAndSaveAll = false;
    }
    promises = [];
    tableList.forEach((function(_this) {
      return function(tableName) {
        var actions, dbModel, promise;
        dbModel = _this.db[tableName];
        actions = [];
        if (forceServerCleanAndSaveAll) {
          dbModel.collection.forEach(function(item) {
            return actions.push({
              action: 'insert',
              id: item.id,
              item: sjcl.encrypt(_this.storageService.getEncryptionKey(), angular.toJson(item))
            });
          });
        } else {
          actions = dbModel.actionsLog;
          actions.forEach(function(action) {
            if (action.item) {
              return action.item = sjcl.encrypt(_this.storageService.getEncryptionKey(), angular.toJson(action.item));
            }
          });
        }
        promise = _this.userService.writeData(_this.appName, tableName, actions, forceServerCleanAndSaveAll).then(function(response) {
          dbModel.updatedAt = response.data.updatedAt;
          _this.storageService.setLastModifiedDate(_this.appName, tableName, dbModel.updatedAt);
          return dbModel.actionsLog = [];
        });
        return promises.push(promise);
      };
    })(this));
    return this.$q.all(promises).then((function(_this) {
      return function(actions) {
        return _this.writeTablesToFS(tableList).then(function() {
          var nothing;
          return nothing = true;
        }, function(error) {
          console.log('failed to write files to file system', error);
          return error;
        });
      };
    })(this), (function(_this) {
      return function(error) {
        console.log('failed to write tables to the web', error);
        return {
          data: error.data,
          status: error.status,
          headers: error.headers
        };
      };
    })(this));
  };

  return Database;

})();

var IndexedDbDatabase,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

IndexedDbDatabase = (function() {
  function IndexedDbDatabase(appName, $q, storageService, userService) {
    this.saveTables = __bind(this.saveTables, this);
    this.getTables = __bind(this.getTables, this);
    this.createCollection = __bind(this.createCollection, this);
    this.getTable = __bind(this.getTable, this);
    this.getTablesNeedUpdating = __bind(this.getTablesNeedUpdating, this);
    this.applyActions = __bind(this.applyActions, this);
    this.storageService = storageService;
    this.appName = appName;
    this.userService = userService;
    this.db = {};
    this.user = storageService.getUserDetails();
  }

  IndexedDbDatabase.prototype.applyActions = function(tableName, dbModel, actions) {
    var index, lastUpdatedAt;
    lastUpdatedAt = 0;
    dbModel.actionsLog = [];
    index = 0;
    return RSVP.promiseWhile(function() {
      return index < actions.length;
    }, (function(_this) {
      return function() {
        var err, item, op;
        op = actions[index];
        index += 1;
        lastUpdatedAt = op.updatedAt;
        if (op.action === 'update') {
          try {
            item = JSON.parse(sjcl.decrypt(_this.storageService.getEncryptionKey(), op.item));
            return dbModel.$updateOrSet(item, op.updatedAt);
          } catch (_error) {
            err = _error;
            console.log('failed to decrypt', tableName, op, err);
            throw 'failed to decrypt';
          }
        } else if (op.action === 'delete') {
          return dbModel.$deleteItem(op.id, op.updatedAt);
        }
      };
    })(this)).then(function() {
      return lastUpdatedAt;
    }, function(err) {
      return console.log(err);
    });
  };

  IndexedDbDatabase.prototype.getTablesNeedUpdating = function(tableList, forceLoadAll) {
    var staleTableList;
    staleTableList = [];
    tableList.forEach((function(_this) {
      return function(tableName) {
        var lastModifiedServerTime, lastSyncDate;
        if (forceLoadAll) {
          return staleTableList.push({
            name: tableName,
            getFrom: 0
          });
        } else {
          lastModifiedServerTime = _this.storageService.getLastModifiedDate(_this.appName, tableName);
          lastSyncDate = _this.storageService.getLocalLastSyncDate(_this.appName, tableName);
          if (lastModifiedServerTime && lastModifiedServerTime > lastSyncDate) {
            return staleTableList.push({
              name: tableName,
              getFrom: lastSyncDate
            });
          }
        }
      };
    })(this));
    return staleTableList;
  };

  IndexedDbDatabase.prototype.getTable = function(tableName, getDataFrom, forceLoadAll) {
    var dbModel;
    dbModel = this.db[tableName];
    return this.userService.readData(this.appName, tableName, getDataFrom).then((function(_this) {
      return function(response) {
        var perhapsResetPromise;
        perhapsResetPromise = forceLoadAll ? dbModel.reset() : RSVP.Promise.resolve();
        return perhapsResetPromise.then(function() {
          var err;
          if (response.data.actions.length > 0) {
            try {
              return _this.applyActions(tableName, dbModel, response.data.actions).then(function(lastUpdatedAt) {
                _this.storageService.setLocalLastSyncDate(_this.appName, tableName, lastUpdatedAt);
                return _this.storageService.setLastModifiedDate(_this.appName, tableName, lastUpdatedAt);
              });
            } catch (_error) {
              err = _error;
              console.log("error updating " + tableName + " after getting response from web");
              throw err;
            }
          }
        });
      };
    })(this));
  };

  IndexedDbDatabase.prototype.createCollection = function(name, collectionInstance) {
    this.db[name] = collectionInstance;
    return collectionInstance;
  };

  IndexedDbDatabase.prototype.getTables = function(tableList, forceLoadAll) {
    return this.userService.getLastModified().then((function(_this) {
      return function(response) {
        var promises, staleTableList;
        _this.storageService.setLastModifiedDateRaw(response.data.lastModifiedDate);
        staleTableList = _this.getTablesNeedUpdating(tableList, forceLoadAll);
        promises = staleTableList.map(function(table) {
          return _this.getTable(table.name, table.getFrom, forceLoadAll);
        });
        return RSVP.all(promises);
      };
    })(this));
  };

  IndexedDbDatabase.prototype.saveTables = function(tableList, forceServerCleanAndSaveAll) {
    var promises;
    if (forceServerCleanAndSaveAll == null) {
      forceServerCleanAndSaveAll = false;
    }
    promises = [];
    tableList.forEach((function(_this) {
      return function(tableName) {
        var actions, dbModel, promise;
        dbModel = _this.db[tableName];
        actions = [];
        if (forceServerCleanAndSaveAll) {
          dbModel.collection.forEach(function(item) {
            return actions.push({
              action: 'insert',
              id: item.id,
              item: sjcl.encrypt(_this.storageService.getEncryptionKey(), angular.toJson(item))
            });
          });
        } else {
          actions = dbModel.actionsLog;
          actions.forEach(function(action) {
            if (action.item) {
              return action.item = sjcl.encrypt(_this.storageService.getEncryptionKey(), angular.toJson(action.item));
            }
          });
        }
        promise = _this.userService.writeData(_this.appName, tableName, actions, forceServerCleanAndSaveAll).then(function(response) {
          dbModel.updatedAt = response.data.updatedAt;
          _this.storageService.setLastModifiedDate(_this.appName, tableName, dbModel.updatedAt);
          return dbModel.actionsLog = [];
        });
        return promises.push(promise);
      };
    })(this));
    return RSVP.all(promises).then((function(_this) {
      return function(actions) {
        var nothing;
        return nothing = true;
      };
    })(this), (function(_this) {
      return function(error) {
        console.log('failed to write tables to the web', error);
        return {
          data: error.data,
          status: error.status,
          headers: error.headers
        };
      };
    })(this));
  };

  return IndexedDbDatabase;

})();

angular.module('core.controllers', []).controller('LoginOAuthSuccessController', function($scope, $window, userService, storageService, $location, $routeParams) {
  storageService.setToken($routeParams.token);
  return userService.checkLogin().then(function(successResponse) {
    var response;
    response = successResponse.data;
    storageService.setUserDetails(response.user);
    delete $location.$$search.token;
    if (storageService.getEncryptionKey()) {
      return $location.path('/');
    } else {
      return $location.path('/key');
    }
  }, function(failedResponse) {
    return $location.url($location.path('/'));
  });
}).controller('UserKeyController', function($scope, $window, storageService, $location, $q, db) {
  var tables;
  $scope.key = '';
  storageService.setupFilesystem();
  tables = Object.keys(db.tables);
  if (!storageService.getUserDetails()) {
    $location.path('/');
  }
  return $scope.onSubmit = function() {
    storageService.setEncryptionKey($scope.key);
    return storageService.setupFilesystem().then(function() {
      return db.createAllFiles(tables).then(function() {
        return $location.path('/welcome');
      }, function() {
        return $scope.error = 'Failed to set file system';
      });
    }, function() {
      return $scope.error = 'Failed to set file system';
    });
  };
}).controller('UserProfileController', function($scope, $window, $location, $injector, db) {
  var tables;
  tables = Object.keys(db.tables);
  $scope.downloadBackup = function() {
    return db.getTables(tables).then(function() {
      var blob, content, link;
      content = {};
      angular.extend(content, db.dumpAllCollections(tables));
      blob = new Blob([angular.toJson(content)], {
        type: 'application/json'
      });
      link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = $scope.domain + '-' + moment().valueOf().toString() + '-backup.json';
      document.body.appendChild(link);
      return link.click();
    });
  };
  $scope.checkNewData = function() {
    return db.authAndCheckData(tables).then(function() {
      return $scope.showSuccess("Latest data was received from the server");
    });
  };
  return $scope.forceReload = function() {
    return db.getTables(tables, true).then(function() {
      return $scope.showSuccess("All data was received from the server");
    });
  };
}).controller('UserEditProfileController', function($scope, $window, storageService, $location) {
  return $scope.onSubmit = function() {
    storageService.setEncryptionKey($scope.key);
    return $location.path('/line_items');
  };
}).controller('UserLogoutController', function($scope, $window, storageService, userService, $location) {
  if (storageService.getUserDetails()) {
    storageService.onLogout();
  }
  return $location.path('/');
});

angular.module('core.services', []).factory('errorReporter', function() {
  return {
    errorCallbackToScope: function($scope) {
      return function(reason) {
        return $scope.error = "failure for reason: " + reason;
      };
    }
  };
}).factory('localStorageWrapper', function() {
  return {
    set: function(key, value) {
      return amplify.store(key, value);
    },
    get: function(key) {
      return amplify.store(key);
    }
  };
}).factory('sessionStorageWrapper', function() {
  return {
    set: function(key, value) {
      return amplify.store.sessionStorage(key, value);
    },
    get: function(key) {
      return amplify.store.sessionStorage(key);
    }
  };
}).factory('storageService', function($q, localStorageWrapper, sessionStorageWrapper) {
  var appDetails;
  appDetails = {};
  return {
    isAuthenticateTimeAndSet: function() {
      var shouldAuthenticate;
      shouldAuthenticate = false;
      if (!localStorageWrapper.get('lastAuthenticateTime') || moment().diff(moment(localStorageWrapper.get('lastAuthenticateTime')), 'hours') > 1) {
        shouldAuthenticate = true;
      }
      if (shouldAuthenticate) {
        localStorageWrapper.set('lastAuthenticateTime', moment().toISOString());
      }
      return shouldAuthenticate;
    },
    getUserDetails: function() {
      return localStorageWrapper.get('user');
    },
    setAppName: function(appName, appDomain) {
      appDetails = {
        appName: appName,
        appDomain: appDomain
      };
      return localStorageWrapper.set('appDetails', appDetails);
    },
    isUserExists: function() {
      return !!localStorageWrapper.get('user');
    },
    setUserDetails: function(userDetails) {
      return localStorageWrapper.set('user', userDetails);
    },
    getLastModifiedDate: function(appName, tableName) {
      var user;
      user = localStorageWrapper.get('user');
      if (!user || !user.lastModifiedDate) {
        return 0;
      }
      return user.lastModifiedDate["" + appName + "-" + tableName] || 0;
    },
    setLastModifiedDate: function(appName, tableName, updatedAt) {
      var userDetails;
      userDetails = localStorageWrapper.get('user');
      userDetails.lastModifiedDate["" + appName + "-" + tableName] = updatedAt;
      return localStorageWrapper.set('user', userDetails);
    },
    setLastModifiedDateRaw: function(data) {
      var userDetails;
      userDetails = localStorageWrapper.get('user');
      userDetails.lastModifiedDate = data;
      return localStorageWrapper.set('user', userDetails);
    },
    getLocalLastSyncDate: function(appName, tableName) {
      var syncDate, userId;
      userId = localStorageWrapper.get('user').id;
      syncDate = localStorageWrapper.get("" + userId + "-syncDate");
      if (!syncDate) {
        return 0;
      }
      return syncDate["" + appName + "-" + tableName] || 0;
    },
    setLocalLastSyncDate: function(appName, tableName, updatedAt) {
      var syncDate, userId;
      userId = localStorageWrapper.get('user').id;
      syncDate = localStorageWrapper.get("" + userId + "-syncDate") || {};
      syncDate["" + appName + "-" + tableName] = updatedAt;
      return localStorageWrapper.set("" + userId + "-syncDate", syncDate);
    },
    getEncryptionKey: function() {
      var userId;
      userId = localStorageWrapper.get('user').id;
      if (!userId) {
        return null;
      }
      return localStorageWrapper.get("" + userId + "-encryptionKey");
    },
    setEncryptionKey: function(encryptionKey) {
      var userId;
      userId = localStorageWrapper.get('user').id;
      if (!userId) {
        return;
      }
      return localStorageWrapper.set("" + userId + "-encryptionKey", encryptionKey);
    },
    onLogout: function() {
      var userId;
      if (!this.isUserExists()) {
        return;
      }
      userId = localStorageWrapper.get('user').id;
      if (!userId) {
        return;
      }
      localStorageWrapper.set("" + userId + "-encryptionKey", null);
      return localStorageWrapper.set('user', null);
    },
    getToken: function() {
      return localStorageWrapper.get("auth-token");
    },
    setToken: function(token) {
      return localStorageWrapper.set("auth-token", token);
    },
    getSuccessMsg: function() {
      return sessionStorageWrapper.get('successMsg');
    },
    setSuccessMsg: function(msg) {
      return sessionStorageWrapper.set('successMsg', msg);
    },
    getNoticeMsg: function() {
      return sessionStorageWrapper.get('noticeMsg');
    },
    setNoticeMsg: function(msg) {
      return sessionStorageWrapper.set('noticeMsg', msg);
    },
    clearMsgs: function() {
      sessionStorageWrapper.set('successMsg', null);
      return sessionStorageWrapper.set('noticeMsg', null);
    },
    readFile: function(fileName) {
      var defer;
      defer = $q.defer();
      this.setupFilesystem().then(function(config) {
        return config.filer.cd('/db', function(dir) {
          return config.filer.open(fileName, function(file) {
            var reader;
            reader = new FileReader();
            reader.onload = function(e) {
              return defer.resolve(reader.result);
            };
            return reader.readAsText(file);
          }, function(err) {
            return defer.reject(err);
          });
        });
      });
      return defer.promise;
    },
    writeFileIfNotExist: function(fileName, content) {
      var defer;
      defer = $q.defer();
      this.setupFilesystem().then(function(config) {
        return config.filer.ls('/db/', function(entries) {
          var existingFiles;
          existingFiles = {};
          entries.forEach(function(entry) {
            return existingFiles[entry.name] = true;
          });
          if (existingFiles[fileName]) {
            return defer.resolve();
          } else {
            return config.filer.write('/db/' + fileName, {
              data: content,
              type: 'text/plain'
            }, function(fileEntry, fileWriter) {
              console.log('creating file: ', fileName);
              return defer.resolve();
            }, function(err) {
              return defer.reject(err);
            });
          }
        }, function(err) {
          return defer.reject(err);
        });
      });
      return defer.promise;
    },
    writeFile: function(fileName, content) {
      var defer;
      defer = $q.defer();
      this.setupFilesystem().then(function(config) {
        return config.filer.write('/db/' + fileName, {
          data: content,
          type: 'text/plain'
        }, function(fileEntry, fileWriter) {
          return defer.resolve(config);
        }, function(err) {
          return defer.reject(err);
        });
      }, function(err) {
        return defer.reject(err);
      });
      return defer.promise;
    },
    setupFilesystem: function() {
      var defer, filer;
      defer = $q.defer();
      filer = new Filer();
      filer.init({
        persistent: true,
        size: 1024 * 1024 * 50
      }, function(fs) {
        return filer.mkdir('/db', false, function(dirEntry) {
          return defer.resolve({
            fs: fs,
            filer: filer
          });
        }, function(err) {
          return defer.reject(err);
        });
      }, function(err) {
        return defer.reject(err);
      });
      return defer.promise;
    }
  };
}).factory('userService', function($http, storageService, $location) {
  var apiServerUrl;
  if (Lazy($location.host()).contains('local.com')) {
    apiServerUrl = 'http://api.moshebergman.local.com:10000';
  } else if (Lazy($location.host()).contains('vagrant.com')) {
    apiServerUrl = 'http://api.moshebergman.vagrant.com';
  } else {
    apiServerUrl = 'https://api.moshebergman.com';
  }
  return {
    oauthUrl: function(domain) {
      return apiServerUrl + '/auth/google?site=' + domain;
    },
    authenticate: function() {
      return $http.get(apiServerUrl + '/data/authenticate', {
        headers: {
          'Authorization': storageService.getToken()
        }
      });
    },
    getLastModified: function() {
      return $http.get(apiServerUrl + '/data/get_last_modified', {
        headers: {
          'Authorization': storageService.getToken()
        }
      });
    },
    readData: function(appName, tableName, readDataFrom) {
      return $http.get(apiServerUrl + ("/data/" + appName + "/" + tableName + "?") + $.param({
        updatedAt: readDataFrom
      }), {
        headers: {
          'Authorization': storageService.getToken()
        }
      });
    },
    writeData: function(appName, tableName, actions, forceServerCleanAndSaveAll) {
      if (forceServerCleanAndSaveAll == null) {
        forceServerCleanAndSaveAll = false;
      }
      return $http.post(apiServerUrl + ("/data/" + appName + "/" + tableName + "?all=" + (!!forceServerCleanAndSaveAll)), actions, {
        headers: {
          'Authorization': storageService.getToken()
        }
      });
    },
    checkLogin: function() {
      return $http.get(apiServerUrl + '/auth/check_login', {
        headers: {
          'Authorization': storageService.getToken()
        }
      });
    },
    register: function(user) {
      return $http.post(apiServerUrl + '/auth/register', user);
    },
    login: function(user) {
      return $http.post(apiServerUrl + '/auth/login', user);
    },
    logout: function() {
      return $http.post(apiServerUrl + '/auth/logout');
    },
    getEvents: function() {
      return $http.get(apiServerUrl + '/gcal/', {
        headers: {
          'Authorization': storageService.getToken()
        }
      });
    }
  };
});

angular.module('core.directives', []).directive('currencyWithSign', function($filter) {
  return {
    restrict: 'E',
    link: function(scope, elm, attrs) {
      var currencyFilter;
      currencyFilter = $filter('currency');
      return scope.$watch(attrs.amount, function(value) {
        if (typeof value !== 'string') {
          value = value.toString();
        }
        if (typeof value === 'undefined' || value === null) {
          return elm.html('');
        } else if (value[0] === '-') {
          return elm.html('<span class="negative">' + currencyFilter(value) + '</span>');
        } else {
          return elm.html('<span class="positive">' + currencyFilter(value) + '</span>');
        }
      });
    }
  };
}).directive('dateFormat', function($filter) {
  var dateFilter;
  dateFilter = $filter('localDate');
  return {
    require: 'ngModel',
    link: function(scope, element, attr, ngModelCtrl) {
      ngModelCtrl.$formatters.unshift(function(value) {
        if (value) {
          return dateFilter(value);
        } else {
          return '';
        }
      });
      return ngModelCtrl.$parsers.push(function(value) {
        if (value) {
          return moment(value).valueOf();
        } else {
          return null;
        }
      });
    }
  };
}).directive('unixDateFormat', function($filter) {
  var dateFilter;
  dateFilter = $filter('unixLocalDate');
  return {
    require: 'ngModel',
    link: function(scope, element, attr, ngModelCtrl) {
      ngModelCtrl.$formatters.unshift(function(value) {
        if (value) {
          return dateFilter(value);
        } else {
          return '';
        }
      });
      return ngModelCtrl.$parsers.push(function(value) {
        if (value) {
          return moment(value).unix();
        } else {
          return null;
        }
      });
    }
  };
}).directive('floatToString', function($filter) {
  return {
    require: 'ngModel',
    link: function(scope, element, attr, ngModelCtrl) {
      ngModelCtrl.$formatters.unshift(function(value) {
        if (!value) {
          return 0;
        }
        return parseFloat(value);
      });
      return ngModelCtrl.$parsers.push(function(value) {
        if (!value) {
          return "0";
        } else {
          return value.toString();
        }
      });
    }
  };
}).directive('typeFormat', function($filter) {
  var typeFilter;
  typeFilter = $filter('typeString');
  return {
    require: 'ngModel',
    link: function(scope, element, attr, ngModelCtrl) {
      ngModelCtrl.$formatters.unshift(function(value) {
        return typeFilter(value);
      });
      return ngModelCtrl.$parsers.push(function(value) {
        if (value === 'Expense') {
          return LineItemCollection.EXPENSE;
        } else {
          return LineItemCollection.INCOME;
        }
      });
    }
  };
}).directive('numbersOnly', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, modelCtrl) {
      return modelCtrl.$parsers.push(function(inputValue) {
        return parseInt(inputValue, 10);
      });
    }
  };
}).directive('pickadate', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      var initialized;
      initialized = false;
      return scope.$watch(function() {
        return ngModel.$modelValue;
      }, function(newValue) {
        if (newValue && !initialized) {
          element.pickadate({
            format: 'mm/dd/yyyy'
          });
          return initialized = true;
        }
      });
    }
  };
}).directive("fileread", function() {
  return {
    scope: {
      fileread: "="
    },
    link: function(scope, element, attributes) {
      return element.bind("change", function(changeEvent) {
        return scope.$apply(function() {
          return scope.fileread = changeEvent.target.files[0];
        });
      });
    }
  };
}).directive('ngConfirmClick', function() {
  return {
    link: function(scope, element, attr) {
      var clickAction, msg;
      msg = attr.ngConfirmClick || "Are you sure?";
      clickAction = attr.confirmedClick;
      return element.bind('click', function(event) {
        if (window.confirm(msg)) {
          return scope.$eval(clickAction);
        }
      });
    }
  };
}).directive('autoresize', function($window) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var offset, resize;
      offset = !$window.opera ? element[0].offsetHeight - element[0].clientHeight : element[0].offsetHeight + parseInt($window.getComputedStyle(element[0], null).getPropertyValue('border-top-width'));
      resize = function(el) {
        el.style.height = 'auto';
        return el.style.height = (el.scrollHeight + offset) + 'px';
      };
      element.bind('input', function() {
        return resize(element[0]);
      });
      return element.bind('keyup', function() {
        return resize(element[0]);
      });
    }
  };
}).directive('selectize', function($timeout) {
  return {
    restrict: 'A',
    require: '?ngModel',
    link: function(scope, element, attrs, ngModel) {
      return $timeout(function() {
        var allItems, alteredAllItems, selectedItem;
        if (attrs.selectize === 'stringsWithCreate') {
          allItems = scope.$eval(attrs.allItems);
          if (allItems) {
            alteredAllItems = allItems.map(function(item) {
              return {
                value: item,
                text: item
              };
            });
            if (!attrs.multiple) {
              selectedItem = ngModel.$modelValue;
              if (selectedItem && allItems.indexOf(selectedItem) < 0) {
                alteredAllItems.push({
                  value: selectedItem,
                  text: selectedItem
                });
              }
            }
          }
          return $(element).selectize({
            plugins: ['restore_on_backspace'],
            persist: false,
            createOnBlur: true,
            sortField: 'text',
            options: alteredAllItems,
            create: function(input) {
              return {
                value: input,
                text: input
              };
            }
          });
        } else if (attrs.selectize === 'strings') {
          allItems = scope.$eval(attrs.allItems);
          if (allItems) {
            alteredAllItems = allItems.map(function(item) {
              return {
                value: item,
                text: item
              };
            });
          }
          return $(element).selectize({
            persist: false,
            sortField: 'text',
            options: alteredAllItems
          });
        } else if (attrs.selectize === 'objectsWithIdName') {
          ngModel.$parsers.push(function(value) {
            return value.map(function(item) {
              return parseInt(item, 10);
            });
          });
          allItems = scope.$eval(attrs.allItems);
          return $(element).selectize({
            create: false,
            valueField: 'id',
            labelField: 'name',
            searchField: 'name'
          });
        }
      });
    }
  };
});

angular.module('core.filters', []).filter('localDate', function($filter) {
  var angularDateFilter;
  angularDateFilter = $filter('date');
  return function(theDate) {
    return angularDateFilter(theDate, 'MM/dd/yyyy');
  };
}).filter('unixLocalDate', function($filter) {
  var angularDateFilter;
  angularDateFilter = $filter('date');
  return function(theDate) {
    return angularDateFilter(new Date(theDate * 1000), 'MM/dd/yyyy');
  };
}).filter('monthDay', function($filter) {
  var angularDateFilter;
  angularDateFilter = $filter('date');
  return function(theDate) {
    return angularDateFilter(theDate, 'MM/dd');
  };
}).filter('percent', function() {
  return function(value) {
    return value + '%';
  };
}).filter('mbCurrency', function($filter) {
  var angularCurrencyFilter;
  angularCurrencyFilter = $filter('currency');
  return function(number) {
    var result;
    result = angularCurrencyFilter(number);
    if (result[0] === '(') {
      return '-' + result.slice(1, -1);
    } else {
      return result;
    }
  };
}).filter('typeString', function($filter) {
  return function(typeInt) {
    if (typeInt === LineItemCollection.EXPENSE) {
      return 'Expense';
    } else {
      return 'Income';
    }
  };
}).filter('bnToFixed', function($window) {
  return function(value, format) {
    if (typeof value === 'undefined' || value === null) {
      return '';
    }
    return value.toFixed(2);
  };
}).filter('unixDateFormat', function() {
  return function(value, format) {
    if (typeof value === 'undefined' || value === null) {
      return '';
    }
    if (!isNaN(parseFloat(value)) && isFinite(value)) {
      value = new Date(parseInt(value, 10));
    }
    return moment.unix(value).format(format);
  };
}).filter('joinBy', function() {
  return function(input, delimiter) {
    return (input || []).join(delimiter || ', ');
  };
}).filter('newline', function($sce) {
  return function(string) {
    if (!string) {
      return '';
    }
    return $sce.trustAsHtml(string.replace(/\n/g, '<br/>'));
  };
}).filter('encodeUri', function($window) {
  return $window.encodeURIComponent;
});
