/*
weird functions to fix issues:
convertId = function(id) { return parseInt(id[0], 10) + id.length - 1 }
events:
angular.element('.list-group').injector().get('mdb').events().collection.forEach(function(item, index) { if(item.participantIds && item.participantIds[0]) { console.log(item.participantIds[0], convertId(item.participantIds[0])); } })
angular.element('.list-group').injector().get('mdb').events().collection.forEach(function(item, index) { item.participants && item.participants.forEach(function(item, index) {item.participants[index] = parseInt(item.participants[index], 10) }) })
angular.element('.list-group').injector().get('mdb').events().collection.forEach(function(item, index) { item.associatedMemories && item.associatedMemories.forEach(function(item, index) {item.associatedMemories[index] = parseInt(item.associatedMemories[index], 10) }) })
--
events:
angular.element('ng-view').injector().get('mdb').events().collection.forEach(function(item, index) { 
  if(item.participantIds) { 
   item.participantIds.forEach(function(association, index) {
     item.participantIds[index] = parseInt(item.participantIds[index], 10); 
   }) 
  }
  if(item.associatedMemories) {
    item.associatedMemories.forEach(function(association, index) {
     item.associatedMemories[index] = parseInt(item.associatedMemories[index], 10); 
   })  
  }
}) 
angular.element('ng-view').injector().get('mdb').saveTables(['events'], true)
---
memories:
angular.element('ng-view').injector().get('mdb').memories().collection.forEach(function(item, index) { 
 if(item.events) { 
   item.events.forEach(function(association, index) {
     item.events[index] = parseInt(item.events[index], 10); 
   }) 
 }
 if(item.people) { 
   item.people.forEach(function(association, index) {
     item.people[index] = parseInt(item.people[index], 10); 
   }) 
 }
 if(item.parentMemoryId) {
    item.parentMemoryId = parseInt(item.parentMemoryId, 10);
 }
}) 
angular.element('ng-view').injector().get('mdb').saveTables(['memories'], true)
--
line items:
angular.element('.list-group').injector().get('fdb').lineItems().collection.forEach(function(item, index) { 
   item.accountId = parseInt(item.accountId, 10);
   item.importId = parseInt(item.importId, 10);
})
angular.element('.list-group').injector().get('fdb').saveTables(['lineItems'], true) 
--
processing rules:
angular.element('ng-view').injector().get('fdb').processingRules().collection.forEach(function(item, index) { 
   item.id = index + 1;
   angular.element('ng-view').injector().get('fdb').processingRules().actualCollection[item.key].id = index + 1;
})
*/


(function() {
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
      var _this = this;
      if (!this.itemExtendFunc) {
        return;
      }
      return this.collection.forEach(function(item) {
        return _this.itemExtendFunc(item);
      });
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
      var result,
        _this = this;
      if (!ids) {
        return [];
      }
      result = Lazy(ids).map(function(id) {
        return _this.collection[_this.idIndex[id]];
      }).toArray();
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
      if (!this.idIndex[item.id]) {
        this.collection.push(item);
        this.idIndex[item.id] = this.collection.length - 1;
      } else {
        this.collection[this.idIndex[item.id]] = item;
      }
      this.extendItem(item);
      item.updatedAt = updatedAt;
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
      var _this = this;
      this.collection.forEach(function(item) {
        return _this.correctId(item);
      });
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
      var _this = this;
      if (!items) {
        return;
      }
      if (!(items instanceof Array)) {
        items = [items];
      }
      if (!items[0]) {
        return;
      }
      return items.forEach(function(item) {
        return _this.set(item, true);
      });
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
      var items,
        _this = this;
      if (this.collection instanceof Array) {
        this.collection.forEach(function(item) {
          return _this.correctId(item);
        });
        this.$buildIndex();
        return this.collection.forEach(function(item) {
          return _this.actualCollection[item.key] = {
            id: item.id,
            value: item.value
          };
        });
      } else {
        items = this.collection;
        this.collection = [];
        Lazy(items).keys().each(function(key) {
          return _this.set(key, items[key]);
        });
        return this.actionsLog = [];
      }
    };

    return SimpleCollection;

  })();

  window.Database = (function() {
    function Database(appName, $http, $q, $sessionStorage, $localStorage, fileSystem) {
      this.saveTables = __bind(this.saveTables, this);
      this.readTablesFromWeb = __bind(this.readTablesFromWeb, this);
      this.authenticate = __bind(this.authenticate, this);
      this.dumpAllCollections = __bind(this.dumpAllCollections, this);
      this.collectionToStorage = __bind(this.collectionToStorage, this);
      this.writeTablesToFS = __bind(this.writeTablesToFS, this);
      this.readTablesFromFS = __bind(this.readTablesFromFS, this);
      this.createCollection = __bind(this.createCollection, this);
      this.user = __bind(this.user, this);
      this.$http = $http;
      this.$q = $q;
      this.$sessionStorage = $sessionStorage;
      this.$localStorage = $localStorage;
      this.appName = appName;
      this.fileSystem = fileSystem;
      this.db = {
        user: {
          config: {
            incomeCategories: ['Income:Salary', 'Income:Dividend', 'Income:Misc']
          }
        }
      };
    }

    Database.prototype.user = function() {
      return this.db.user;
    };

    Database.prototype.createCollection = function(name, collectionInstance) {
      this.db[name] = collectionInstance;
      return collectionInstance;
    };

    Database.prototype.fileName = function(userId, tableName) {
      return "" + userId + "-" + this.appName + "-" + tableName + ".json";
    };

    Database.prototype.readTablesFromFS = function(tableNames) {
      var promises,
        _this = this;
      promises = tableNames.map(function(tableName) {
        return _this.fileSystem.readFile('/db/' + _this.fileName(_this.db.user.id, tableName)).then(function(content) {
          return {
            name: tableName,
            content: JSON.parse(content)
          };
        });
      });
      return this.$q.all(promises);
    };

    Database.prototype.writeTablesToFS = function(tableNames) {
      var promises,
        _this = this;
      promises = tableNames.map(function(tableName) {
        return _this.fileSystem.writeText('/db/' + _this.fileName(_this.db.user.id, tableName), angular.toJson(_this.collectionToStorage(tableName))).then(function() {
          return console.log('write', tableName, 'to FS');
        }, function(err) {
          return console.log('failed to write', tableName, 'to FS', err);
        });
      });
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
      var result,
        _this = this;
      result = {};
      result[this.appName] = Lazy(tableList).map(function(tableName) {
        return {
          name: tableName,
          content: _this.collectionToStorage(tableName)
        };
      }).toArray();
      return result;
    };

    Database.prototype.authenticate = function() {
      var defer,
        _this = this;
      defer = this.$q.defer();
      this.$http.get('/data/authenticate').success(function(response, status, headers) {
        _this.$localStorage.user = response.user;
        return defer.resolve();
      }).error(function(data, status, headers) {
        return defer.reject({
          data: data,
          status: status,
          headers: headers
        });
      });
      return defer.promise;
    };

    Database.prototype.readTablesFromWeb = function(tableList, forceLoadAll) {
      var deferred, promises, staleTableList,
        _this = this;
      staleTableList = [];
      if (forceLoadAll) {
        staleTableList = tableList;
      } else {
        tableList.forEach(function(tableName) {
          var dbModel, lastModifiedServerTime;
          dbModel = _this.db[tableName];
          lastModifiedServerTime = _this.db.user.lastModifiedDate["" + _this.appName + "-" + tableName];
          if (lastModifiedServerTime && lastModifiedServerTime > dbModel.updatedAt) {
            return staleTableList.push(tableName);
          }
        });
      }
      deferred = this.$q.defer();
      promises = [];
      staleTableList.forEach(function(tableName) {
        var dbModel, getDataFrom, promise;
        dbModel = _this.db[tableName];
        if (forceLoadAll) {
          dbModel.reset();
          getDataFrom = 0;
        } else {
          getDataFrom = dbModel.updatedAt;
        }
        promise = _this.$http.get(("/data/" + _this.appName + "/" + tableName + "?") + $.param({
          updatedAt: getDataFrom
        })).then(function(response) {
          var err;
          try {
            dbModel.actionsLog = [];
            return response.data.actions.forEach(function(op) {
              if (op.action === 'update') {
                try {
                  return dbModel.$updateOrSet(JSON.parse(sjcl.decrypt(_this.$localStorage["" + _this.db.user.id + "-encryptionKey"], op.item)), op.updatedAt);
                } catch (_error) {
                  console.log('failed to decrypt', tableName, op);
                  throw 'failed to decrypt';
                }
              } else if (op.action === 'delete') {
                return dbModel.$deleteItem(op.id, op.updatedAt);
              }
            });
          } catch (_error) {
            err = _error;
            console.log("error updating " + tableName + " after getting response from web");
            throw err;
          }
        });
        return promises.push(promise);
      });
      this.$q.all(promises).then(function(actions) {
        return deferred.resolve(staleTableList);
      }, function(fail) {
        console.log('fail', fail);
        return deferred.reject({
          data: fail.data,
          status: fail.status,
          headers: fail.headers
        });
      });
      return deferred.promise;
    };

    Database.prototype.performGet = function(tableList, options) {
      var copyUserDataFromSession, deferred, loadDataSet, loadedDataFromFS, onAuthenticated, onFailedAuthenticate, onFailedReadTablesFromFS, onFailedReadTablesFromWeb, onReadTablesFromFS, onReadTablesFromWeb,
        _this = this;
      deferred = this.$q.defer();
      loadedDataFromFS = false;
      copyUserDataFromSession = function() {
        return _this.db.user = angular.extend(_this.db.user, angular.copy(_this.$localStorage.user));
      };
      onAuthenticated = function() {
        if (!_this.$localStorage["" + _this.db.user.id + "-encryptionKey"]) {
          return deferred.reject({
            data: {
              reason: 'missing_key'
            },
            status: 403
          });
        } else {
          copyUserDataFromSession();
          if (options.initialState === 'authenticate') {
            return _this.readTablesFromWeb(tableList).then(onReadTablesFromWeb, onFailedReadTablesFromWeb);
          } else {
            return _this.readTablesFromFS(tableList).then(onReadTablesFromFS, onFailedReadTablesFromFS);
          }
        }
      };
      onFailedAuthenticate = function(response) {
        return deferred.reject(response);
      };
      onReadTablesFromWeb = function(staleTables) {
        _this.writeTablesToFS(staleTables);
        if (staleTables.length > 0) {
          console.log('stale data sets ', staleTables, ' were updated from the web - resolving');
        }
        return deferred.resolve(_this);
      };
      onFailedReadTablesFromWeb = function(response) {
        return deferred.reject(response);
      };
      onReadTablesFromFS = function(fileContents) {
        loadedDataFromFS = true;
        fileContents.forEach(loadDataSet);
        console.log('read data sets ', tableList, ' from file system - resolving');
        return deferred.resolve(_this);
      };
      onFailedReadTablesFromFS = function() {
        return _this.readTablesFromWeb(tableList).then(onReadTablesFromWeb, onFailedReadTablesFromWeb);
      };
      loadDataSet = function(dataSet) {
        var dbModel;
        dbModel = _this.db[dataSet.name];
        if (!dataSet.content) {
          console.log('failed to load ' + dataSet.name);
          return;
        }
        if (!dataSet.content.version) {
          console.log('failed to load ' + dataSet.name + ' - version missing');
          return;
        }
        dbModel.updatedAt = dataSet.content.updatedAt;
        dbModel.collection = dataSet.content.data;
        dbModel.afterLoadCollection();
        return dbModel.reExtendItems();
      };
      if (options.initialState === 'authenticate') {
        this.authenticate().then(onAuthenticated, onFailedAuthenticate);
      } else {
        copyUserDataFromSession();
        if (!this.$localStorage["" + this.db.user.id + "-encryptionKey"]) {
          deferred.reject({
            data: {
              reason: 'missing_key'
            },
            status: 403
          });
        } else if (options.initialState === 'readFromWeb') {
          this.readTablesFromWeb(tableList, options.forceRefreshAll).then(onReadTablesFromWeb, onFailedReadTablesFromWeb);
        } else if (options.initialState === 'readFromFS') {
          this.readTablesFromFS(tableList).then(onReadTablesFromFS, onFailedReadTablesFromFS);
        }
      }
      return deferred.promise;
    };

    Database.prototype.authAndCheckData = function(tableList) {
      return this.performGet(tableList, {
        initialState: 'authenticate',
        forceRefreshAll: false
      });
    };

    Database.prototype.getTables = function(tableList, forceRefreshAll) {
      if (forceRefreshAll == null) {
        forceRefreshAll = false;
      }
      if (this.$localStorage.user && forceRefreshAll) {
        return this.performGet(tableList, {
          initialState: 'readFromWeb',
          forceRefreshAll: true
        });
      } else if (this.$localStorage.user && !forceRefreshAll) {
        return this.performGet(tableList, {
          initialState: 'readFromFS',
          forceRefreshAll: false
        });
      } else {
        return this.performGet(tableList, {
          initialState: 'authenticate',
          forceRefreshAll: false
        });
      }
    };

    Database.prototype.saveTables = function(tableList, forceServerCleanAndSaveAll) {
      var deferred, promises,
        _this = this;
      if (forceServerCleanAndSaveAll == null) {
        forceServerCleanAndSaveAll = false;
      }
      deferred = this.$q.defer();
      promises = [];
      tableList.forEach(function(tableName) {
        var actions, dbModel, promise;
        dbModel = _this.db[tableName];
        actions = [];
        if (forceServerCleanAndSaveAll) {
          dbModel.collection.forEach(function(item) {
            return actions.push({
              action: 'insert',
              id: item.id,
              item: sjcl.encrypt(_this.$localStorage["" + _this.db.user.id + "-encryptionKey"], angular.toJson(item))
            });
          });
        } else {
          actions = dbModel.actionsLog;
          actions.forEach(function(action) {
            if (action.item) {
              return action.item = sjcl.encrypt(_this.$localStorage["" + _this.db.user.id + "-encryptionKey"], angular.toJson(action.item));
            }
          });
        }
        promise = _this.$http.post("/data/" + _this.appName + "/" + tableName + "?all=" + (!!forceServerCleanAndSaveAll), actions).then(function(response) {
          dbModel.updatedAt = response.data.updatedAt;
          _this.db.user.lastModifiedDate["" + _this.appName + "-" + tableName] = dbModel.updatedAt;
          _this.$localStorage.user.lastModifiedDate["" + _this.appName + "-" + tableName] = dbModel.updatedAt;
          return dbModel.actionsLog = [];
        });
        return promises.push(promise);
      });
      this.$q.all(promises).then(function(actions) {
        return _this.writeTablesToFS(tableList).then(function() {
          return deferred.resolve(true);
        }, function(error) {
          console.log('failed to write files to file system', error);
          return deferred.reject('failed to write to file system');
        });
      }, function(fail) {
        console.log('fail', fail);
        return deferred.reject({
          data: fail.data,
          status: fail.status,
          headers: fail.headers
        });
      });
      return deferred.promise;
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
            return (_base = column['values'])[type] != null ? (_base = column['values'])[type] : _base[type] = new BigNumber(0);
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

}).call(this);
