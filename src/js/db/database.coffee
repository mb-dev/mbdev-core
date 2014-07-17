class window.Database
  constructor: (appName, $q, storageService, userService) ->
    @$q = $q
    @storageService = storageService
    @appName = appName
    @userService = userService
    @db = {}
    @user = storageService.getUserDetails()

  createCollection: (name, collectionInstance) =>
    @db[name] = collectionInstance
    collectionInstance

  # file system API
  fileName: (userId, tableName) ->
    "#{userId}-#{@appName}-#{tableName}.json"

  createAllFiles: (tableNames) =>
    promises = tableNames.map (tableName) =>
      @storageService.writeFileIfNotExist(@fileName(@user.id, tableName), "")
    @$q.all(promises)

  readTablesFromFS: (tableNames) =>
    promises = tableNames.map (tableName) => 
      if(@db[tableName].collection.length > 0)
        return null
      @storageService.readFile(@fileName(@user.id, tableName)).then (content) =>
        return if !content
        content = JSON.parse(content)
        dbModel = @db[tableName]
        if !content.version
          console.log('failed to load ' + tableName + ' - version missing')
          return
        dbModel.updatedAt = content.updatedAt
        dbModel.collection = content.data
        dbModel.afterLoadCollection()
        dbModel.reExtendItems()

    @$q.all(promises).then ->
      console.log 'read data sets ', tableNames, ' from file system - resolving'

  writeTablesToFS: (tableNames) =>
    promises = tableNames.map (tableName) =>
      @storageService.writeFile(@fileName(@user.id, tableName), angular.toJson(@collectionToStorage(tableName))).then () ->
        console.log('write', tableName, 'to FS')
      , (err) ->
        console.log('failed to write', tableName, 'to FS', err)

    @$q.all(promises)
  
  collectionToStorage: (tableName) =>
    dbModel = @db[tableName]
    {
      version: dbModel.version()
      data: dbModel.collection
      updatedAt: dbModel.updatedAt
    }

  dumpAllCollections: (tableList) =>
    result = {}
    result[@appName] = Lazy(tableList).map((tableName) =>
      {
        name: tableName
        content: @collectionToStorage(tableName)
      }
    ).toArray()
    result

  authenticate: =>
    defer = @$q.defer()

    @userService.checkLogin().then (response) =>
      @storageService.setUserDetails(response.data.user)
      defer.resolve()
    , (response) ->
      defer.reject({data: response.data, status: response.status, headers: response.headers})

    defer.promise

  applyActions: (tableName, dbModel, actions) =>
    lastUpdatedAt = 0
    dbModel.actionsLog = []
    actions.forEach (op) =>
      if op.action == 'update'
        try
          dbModel.$updateOrSet(JSON.parse(sjcl.decrypt(@storageService.getEncryptionKey(), op.item)), op.updatedAt)
        catch err
          console.log 'failed to decrypt', tableName, op, err
          throw 'failed to decrypt'
      else if op.action == 'delete'
        dbModel.$deleteItem(op.id, op.updatedAt)
      lastUpdatedAt = op.updatedAt
    lastUpdatedAt

  readTablesFromWeb: (tableList, forceLoadAll) =>
    if forceLoadAll    
      @performReadData(tableList, forceLoadAll)
    else
      @performGetLastModified(tableList, forceLoadAll)

  performGetLastModified: (tableList, forceLoadAll) =>
    @userService.getLastModified().then (response) =>
      @storageService.setLastModifiedDateRaw(response.data.lastModifiedDate)
      @performReadData(tableList, forceLoadAll)

  performReadData: (tableList, forceLoadAll) =>
    # which tables require reading?
    staleTableList = []
    tableList.forEach (tableName) =>
      if forceLoadAll
        staleTableList.push({name: tableName, getFrom: 0 })
      else
        lastModifiedServerTime = @storageService.getLastModifiedDate(@appName, tableName)
        lastSyncDate = @storageService.getLocalLastSyncDate(@appName, tableName)
        if lastModifiedServerTime && lastModifiedServerTime > lastSyncDate
          staleTableList.push({name: tableName, getFrom: lastSyncDate})
    # load them
    promises = []  
    staleTableList.forEach (table) =>
      tableName = table.name
      getDataFrom = table.getFrom
      dbModel = @db[tableName]
      promise = @userService.readData(@appName, tableName, getDataFrom).then (response) =>
        try
          if forceLoadAll
            dbModel.reset()
          if response.data.actions.length > 0
            lastUpdatedAt = @applyActions(tableName, dbModel, response.data.actions)
            @storageService.setLocalLastSyncDate(@appName, tableName, lastUpdatedAt)
            @storageService.setLastModifiedDate(@appName, tableName, lastUpdatedAt)
        catch err
          console.log "error updating #{tableName} after getting response from web"
          throw err
      promises.push(promise)
    
    @$q.all(promises).then (actions) =>
      staleTableList = staleTableList.map((table) -> table.name)
      @writeTablesToFS(staleTableList)
      if staleTableList.length > 0
        console.log 'stale data sets ', staleTableList, ' were updated from the web - resolving'
    , (fail) =>
      console.log 'failed to read tables. Error: ', fail
      fail

  performGet: (tableList, options) ->
    defer = @$q.defer()
    onFailedReadTablesFromFS = (failures) =>
      console.log('failed to read from fs: ', failures)
      @readTablesFromWeb(tableList).then ->
        defer.resolve()
      , (response) ->
        defer.reject(response)
    
    if !@user || !@user.id
      console.log 'missing user'
      defer.reject({data: {reason: 'not_logged_in'}, status: 403})
    else if !@storageService.getEncryptionKey()
      console.log 'missing encryption key'
      defer.reject({data: {reason: 'missing_key'}, status: 403})
    else if options.initialState == 'readFromWeb'
      @readTablesFromWeb(tableList, options.forceRefreshAll).then ->
        defer.resolve()
      , (response) ->
        defer.reject(response)
    else if options.initialState == 'readFromFS'
      @readTablesFromFS(tableList).then(angular.noop, onFailedReadTablesFromFS).then ->
        defer.resolve()
      , (err) -> 
        defer.reject(err)
    defer.promise

  authAndCheckData: (tableList) ->
    @performGet(tableList, {initialState: 'readFromWeb', forceRefreshAll: false})

  getTables: (tableList, forceRefreshAll = false) ->
    # actual getTables code start shere
    if forceRefreshAll
      @performGet(tableList, {initialState: 'readFromWeb', forceRefreshAll: true})
    else 
      @performGet(tableList, {initialState: 'readFromFS', forceRefreshAll: false})  

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
    
    @$q.all(promises).then (actions) =>
      @writeTablesToFS(tableList).then ->
        nothing = true
      , (error) ->
        console.log('failed to write files to file system', error)
        error
    , (error) =>
      console.log 'failed to write tables to the web', error
      {data: error.data, status: error.status, headers: error.headers}

