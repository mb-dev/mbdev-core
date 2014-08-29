class IndexedDbDatabase
  constructor: (appName, $q, storageService, userService) ->
    @storageService = storageService
    @appName = appName
    @userService = userService
    @db = {}
    @user = storageService.getUserDetails()

  # private functions
  applyActions: (tableName, dbModel, actions) =>
    lastUpdatedAt = 0
    dbModel.actionsLog = []
    index = 0
    RSVP.promiseWhile( ->
      index < actions.length
    , =>
      op = actions[index]
      index += 1
      lastUpdatedAt = op.updatedAt
      if op.action == 'update'
        try
          item = JSON.parse(sjcl.decrypt(@storageService.getEncryptionKey(), op.item))
          dbModel.$updateOrSet(item, op.updatedAt)
        catch err
          console.log 'failed to decrypt', tableName, op, err
          throw 'failed to decrypt'
      else if op.action == 'delete'
        dbModel.$deleteItem(op.id, op.updatedAt)
    ).then ->
      lastUpdatedAt
    , (err) ->
      console.log err

  getTablesNeedUpdating: (tableList, forceLoadAll) =>
    staleTableList = []
    tableList.forEach (tableName) =>
      if forceLoadAll
        staleTableList.push({name: tableName, getFrom: 0 })
      else
        lastModifiedServerTime = @storageService.getLastModifiedDate(@appName, tableName)
        lastSyncDate = @storageService.getLocalLastSyncDate(@appName, tableName)
        if lastModifiedServerTime && lastModifiedServerTime > lastSyncDate
          staleTableList.push({name: tableName, getFrom: lastSyncDate})
    staleTableList

  getTable: (tableName, getDataFrom, forceLoadAll) =>
    dbModel = @db[tableName]
    @userService.readData(@appName, tableName, getDataFrom).then (response) =>
      # if we are doing force resync, then clear the collection first
      perhapsResetPromise = if forceLoadAll
        dbModel.reset()
      else
        RSVP.Promise.resolve()
      # start doing the actual sync
      perhapsResetPromise.then => 
        if response.data.actions.length > 0
          try
            @applyActions(tableName, dbModel, response.data.actions).then((lastUpdatedAt) =>
              dbModel.afterLoadCollection().then ->
                lastUpdatedAt
            ).then (lastUpdatedAt) =>
              @storageService.setLocalLastSyncDate(@appName, tableName, lastUpdatedAt)
              @storageService.setLastModifiedDate(@appName, tableName, lastUpdatedAt)
          catch err
            console.log "error updating #{tableName} after getting response from web"
            throw err

  # public functions

  createCollection: (name, collectionInstance) =>
    @db[name] = collectionInstance
    collectionInstance

  getTables: (tableList, forceLoadAll) => 
    @userService.getLastModified().then (response) =>
      @storageService.setLastModifiedDateRaw(response.data.lastModifiedDate)
      staleTableList = @getTablesNeedUpdating(tableList, forceLoadAll)
      promises = staleTableList.map (table) =>
        @getTable(table.name, table.getFrom, forceLoadAll)
      RSVP.all(promises)

  saveTables: (tableList, forceServerCleanAndSaveAll = false) =>    
    promises = []
    tableList.forEach (tableName) =>
      dbModel = @db[tableName]

      actions = []
      if forceServerCleanAndSaveAll
        dbModel.collection.forEach (item) =>
          actions.push({action: 'insert', id: item.id, item: sjcl.encrypt(@storageService.getEncryptionKey(), angular.toJson(item))})
      else
        actions = dbModel.actionsLog
        actions.forEach (action) =>
          if action.item
            action.item = sjcl.encrypt(@storageService.getEncryptionKey(), angular.toJson(action.item))

      promise = @userService.writeData(@appName, tableName, actions, forceServerCleanAndSaveAll).then (response) =>
        dbModel.updatedAt = response.data.updatedAt
        @storageService.setLastModifiedDate(@appName, tableName, dbModel.updatedAt)
        dbModel.actionsLog = []

      promises.push(promise)
    
    RSVP.all(promises).then (actions) =>
      nothing = true
    , (error) =>
      console.log 'failed to write tables to the web', error
      {data: error.data, status: error.status, headers: error.headers}



