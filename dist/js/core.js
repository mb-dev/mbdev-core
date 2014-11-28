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
    return this.rows.forEach(function(row) {
      columns.forEach(function(colValue) {
        var column;
        column = row['columns'][colValue] = {};
        column['values'] = {};
        return valueTypes.forEach(function(type) {
          var _base;
          return (_base = column['values'])[type] != null ? _base[type] : _base[type] = new BigNumber(0);
        });
      });
      return valueTypes.forEach(function(type) {
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
    return _(this.rowByHash[row]['columns']).pairs().map(function(item) {
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

window.IndexedDbCollection = (function(_super) {
  __extends(IndexedDbCollection, _super);

  function IndexedDbCollection(appName, collectionName, sortColumn) {
    this.afterLoadCollection = __bind(this.afterLoadCollection, this);
    this.$deleteItem = __bind(this.$deleteItem, this);
    this.$updateOrSet = __bind(this.$updateOrSet, this);
    this.beforeInsert = __bind(this.beforeInsert, this);
    this.reset = __bind(this.reset, this);
    this.sortLazy = __bind(this.sortLazy, this);
    this.deleteById = __bind(this.deleteById, this);
    this.updateById = __bind(this.updateById, this);
    this.findByIds = __bind(this.findByIds, this);
    this.findById = __bind(this.findById, this);
    this.getItemsCount = __bind(this.getItemsCount, this);
    this.getAll = __bind(this.getAll, this);
    this.clearAll = __bind(this.clearAll, this);
    this.insertMultiple = __bind(this.insertMultiple, this);
    this.insert = __bind(this.insert, this);
    this.createDatabase = __bind(this.createDatabase, this);
    this.getAvailableId = __bind(this.getAvailableId, this);
    this.collectionName = collectionName;
    this.appName = appName;
    this.sortColumn = sortColumn;
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

  IndexedDbCollection.prototype.stripItem = function(item) {
    var key, newItem, value;
    newItem = {};
    for (key in item) {
      value = item[key];
      if (key[0] !== '$') {
        newItem[key] = value;
      }
    }
    return newItem;
  };

  IndexedDbCollection.prototype.createDatabase = function(dbSchema, version) {
    if (!version) {
      version = 1;
    }
    return db.open({
      server: this.appName,
      version: version,
      schema: dbSchema
    }).then((function(_this) {
      return function(client) {
        return _this.dba = client;
      };
    })(this), logError);
  };

  IndexedDbCollection.prototype.insert = function(item, loadingProcess) {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        _this.beforeInsert(item);
        item = _this.stripItem(item);
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
        items.map(_this.stripItem).forEach(_this.beforeInsert);
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
    return this.dba[this.collectionName].query().all().execute();
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
        if (!id) {
          return resolve();
        } else {
          return _this.dba[_this.collectionName].query('id').only(id).execute().then(function(results) {
            return resolve(results[0]);
          }, reject);
        }
      };
    })(this));
  };

  IndexedDbCollection.prototype.findByIds = function(ids) {
    var promises;
    promises = ids.map((function(_this) {
      return function(id) {
        return _this.findById(id);
      };
    })(this));
    return RSVP.all(promises);
  };

  IndexedDbCollection.prototype.updateById = function(item, loadingProcess) {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        item = _this.stripItem(item);
        return _this.dba[_this.collectionName].update(item).then(function() {
          if (!loadingProcess) {
            _this.onEdit(item);
          }
          return resolve();
        }, reject);
      };
    })(this));
  };

  IndexedDbCollection.prototype.deleteById = function(itemId, loadingProcess) {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        return _this.dba[_this.collectionName].remove(itemId).then(function() {
          if (!loadingProcess) {
            _this.onDelete(itemId);
          }
          return resolve();
        }, reject);
      };
    })(this));
  };

  IndexedDbCollection.prototype.sortLazy = function(items, columns) {
    if (!columns && this.sortColumn) {
      columns = this.sortColumn;
    }
    if (columns) {
      return _.sortBy(items, columns);
    } else {
      return items;
    }
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
    })(this), (function(_this) {
      return function(err) {
        console.log(err, _this.collectionName, item);
        return console.log(err.stack);
      };
    })(this));
  };

  IndexedDbCollection.prototype.$deleteItem = function(itemId, updatedAt) {
    var promise;
    promise = this.deleteById(itemId, true);
    if (updatedAt > this.updatedAt) {
      this.updatedAt = updatedAt;
    }
    return promise;
  };

  IndexedDbCollection.prototype.afterLoadCollection = function() {
    var deferred;
    deferred = RSVP.defer();
    deferred.resolve();
    return deferred.promise;
  };

  return IndexedDbCollection;

})(Syncable);

var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

window.IndexedDbSimpleCollection = (function(_super) {
  __extends(IndexedDbSimpleCollection, _super);

  function IndexedDbSimpleCollection() {
    this.rebuildIndex = __bind(this.rebuildIndex, this);
    this.afterLoadCollection = __bind(this.afterLoadCollection, this);
    this.reset = __bind(this.reset, this);
    this.deleteKey = __bind(this.deleteKey, this);
    this.set = __bind(this.set, this);
    this.getAllKeys = __bind(this.getAllKeys, this);
    this.findOrCreate = __bind(this.findOrCreate, this);
    return IndexedDbSimpleCollection.__super__.constructor.apply(this, arguments);
  }

  IndexedDbSimpleCollection.prototype.findOrCreate = function(items) {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        var promises;
        if (!items) {
          resolve();
          return;
        }
        if (!(items instanceof Array)) {
          items = [items];
        }
        if (!items[0]) {
          resolve();
          return;
        }
        promises = items.map(function(item) {
          return _this.set(item, true);
        });
        return RSVP.all(promises).then(resolve)["catch"](reject);
      };
    })(this));
  };

  IndexedDbSimpleCollection.prototype.getAllKeys = function() {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        return resolve(Object.keys(_this.actualCollection));
      };
    })(this));
  };

  IndexedDbSimpleCollection.prototype.set = function(key, value) {
    var deferred, item, newId;
    if (this.actualCollection[key]) {
      item = this.actualCollection[key];
      if (item.value !== value) {
        item.value = value;
        return this.updateById(item);
      } else {
        deferred = RSVP.defer();
        deferred.resolve();
        return deferred.promise;
      }
    } else {
      newId = this.getAvailableId();
      this.actualCollection[key] = {
        id: newId,
        key: key,
        value: value
      };
      return this.insert(this.actualCollection[key]);
    }
  };

  IndexedDbSimpleCollection.prototype.deleteKey = function(key) {
    var item;
    item = this.actualCollection[key];
    return this.deleteById(item.id).then((function(_this) {
      return function() {
        return delete _this.actualCollection[key];
      };
    })(this));
  };

  IndexedDbSimpleCollection.prototype.reset = function() {
    IndexedDbSimpleCollection.__super__.reset.apply(this, arguments);
    return this.actualCollection = {};
  };

  IndexedDbSimpleCollection.prototype.afterLoadCollection = function() {
    var promise;
    promise = IndexedDbSimpleCollection.__super__.afterLoadCollection.apply(this, arguments);
    return promise.then((function(_this) {
      return function() {
        return _this.rebuildIndex();
      };
    })(this));
  };

  IndexedDbSimpleCollection.prototype.rebuildIndex = function() {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        return _this.dba[_this.collectionName].query().all().execute().then(function(items) {
          _this.actualCollection = {};
          items.forEach(function(item) {
            return _this.actualCollection[item.key] = item;
          });
          return resolve();
        }, reject);
      };
    })(this));
  };

  return IndexedDbSimpleCollection;

})(IndexedDbCollection);

var IndexedDbDatabase,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

IndexedDbDatabase = (function() {
  function IndexedDbDatabase(appName, $q, storageService, userService) {
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
        perhapsResetPromise = forceLoadAll ? dbModel.clearAll() : RSVP.Promise.resolve();
        return perhapsResetPromise.then(function() {
          var err;
          if (response.data.actions.length > 0) {
            try {
              return _this.applyActions(tableName, dbModel, response.data.actions).then(function(lastUpdatedAt) {
                return dbModel.afterLoadCollection().then(function() {
                  return lastUpdatedAt;
                });
              }).then(function(lastUpdatedAt) {
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

  IndexedDbDatabase.prototype._getActions = function(dbModel, forceServerCleanAndSaveAll) {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        var actions;
        if (forceServerCleanAndSaveAll) {
          return dbModel.getAll().then(function(items) {
            return resolve(items.map(function(item) {
              return {
                action: 'insert',
                id: item.id,
                item: sjcl.encrypt(_this.storageService.getEncryptionKey(), angular.toJson(item))
              };
            }));
          });
        } else {
          actions = dbModel.actionsLog.map(function(action) {
            return _.extend(_.clone(action), {
              item: sjcl.encrypt(_this.storageService.getEncryptionKey(), angular.toJson(action.item))
            });
          });
          return resolve(actions);
        }
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
        var dbModel, promise;
        dbModel = _this.db[tableName];
        promise = _this._getActions(dbModel, forceServerCleanAndSaveAll).then(function(actions) {
          if (actions.length > 0) {
            _this.userService.writeData(_this.appName, tableName, actions, forceServerCleanAndSaveAll).then(function(response) {
              dbModel.updatedAt = response.data.updatedAt;
              _this.storageService.setLastModifiedDate(_this.appName, tableName, dbModel.updatedAt);
              dbModel.actionsLog = [];
            });
          }
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
  tables = Object.keys(db.tables);
  if (!storageService.getUserDetails()) {
    $location.path('/');
  }
  return $scope.onSubmit = function() {
    storageService.setEncryptionKey($scope.key);
    return $location.path('/welcome');
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
  if (_($location.host()).contains('local.com')) {
    apiServerUrl = 'http://api.moshebergman.local.com:10000/api/core';
  } else if (_($location.host()).contains('vagrant.com')) {
    apiServerUrl = 'http://api.moshebergman.vagrant.com/api/core';
  } else {
    apiServerUrl = 'https://api.moshebergman.com/api/core';
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
        if (value && typeof value !== 'string') {
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
            container: 'body',
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
      var updateSelectize;
      updateSelectize = function() {
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
          ngModel.$parsers.push(function(value) {
            return value.split(',');
          });
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
          ngModel.$parsers.push(function(value) {
            return value.split(',');
          });
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
      };
      return $timeout(function() {
        if (attrs.allItems && attrs.allItems.length > 0) {
          return updateSelectize();
        } else {
          return attrs.$observe('allItems', function(newValue) {
            if (newValue && newValue.length > 0) {
              return updateSelectize();
            }
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
    if (result && result[0] === '(') {
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
