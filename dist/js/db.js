var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

window.Collection = (function() {
  var VERSION;

  VERSION = '1.0';

  function Collection($q, sortColumn) {
    this.afterLoadCollection = __bind(this.afterLoadCollection, this);
    this.$deleteItem = __bind(this.$deleteItem, this);
    this.$updateOrSet = __bind(this.$updateOrSet, this);
    this.$buildIndex = __bind(this.$buildIndex, this);
    this.onModified = __bind(this.onModified, this);
    this.correctId = __bind(this.correctId, this);
    this.reset = __bind(this.reset, this);
    this.length = __bind(this.length, this);
    this.deleteById = __bind(this.deleteById, this);
    this.editById = __bind(this.editById, this);
    this.insert = __bind(this.insert, this);
    this.sortLazy = __bind(this.sortLazy, this);
    this.getAvailableId = __bind(this.getAvailableId, this);
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

  Collection.prototype.getAvailableId = function() {
    var currentTime;
    currentTime = moment().unix();
    if (this.lastIssuedId >= currentTime) {
      return this.lastIssuedId = this.lastIssuedId + 1;
    } else {
      return this.lastIssuedId = currentTime;
    }
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
    this.onModified();
    this.idIndex[details.id] = this.collection.length - 1;
    this.actionsLog.push({
      action: 'insert',
      id: details.id,
      item: details
    });
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
    this.onModified();
    this.actionsLog.push({
      action: 'update',
      id: details.id,
      item: details
    });
    deferred.resolve();
    return deferred.promise;
  };

  Collection.prototype.deleteById = function(itemId, loadingProcess) {
    if (this.idIndex[itemId] === void 0) {
      throw 'not found';
    }
    this.collection.splice(this.idIndex[itemId], 1);
    delete this.idIndex[itemId];
    if (!loadingProcess) {
      this.actionsLog.push({
        action: 'delete',
        id: itemId
      });
      return this.onModified();
    }
  };

  Collection.prototype.length = function() {
    return this.collection.length;
  };

  Collection.prototype.reset = function() {
    this.collection = [];
    this.lastInsertedId = null;
    this.updatedAt = 0;
    this.actionsLog = [];
    this.idIndex = {};
    return this.lastIssuedId = 0;
  };

  Collection.prototype.correctId = function(item) {
    if (item.id && typeof item.id !== 'number') {
      return item.id = parseInt(item.id, 10);
    }
  };

  Collection.prototype.onModified = function() {
    return this.updatedAt = Date.now();
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

})();

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
