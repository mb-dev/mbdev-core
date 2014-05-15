class window.Collection
  VERSION = '1.0'

  constructor: ($q, sortColumn) ->
    @$q = $q
    @sortColumn = sortColumn
    @reset()

  @doNotConvertFunc = (item) -> item

  version: -> VERSION

  migrateIfNeeded: (fromVersion) ->
    # no migrations are available yet

  setItemExtendFunc: (extendFunc) ->
    @itemExtendFunc = extendFunc

  extendItem: (item) ->
    @itemExtendFunc(item) if @itemExtendFunc

  reExtendItems: ->
    return if !@itemExtendFunc
    @collection.forEach (item) =>
      @itemExtendFunc(item)

  getAvailableId: =>
    currentTime = moment().unix()
    if @lastIssuedId >= currentTime
      @lastIssuedId = @lastIssuedId + 1
    else
      @lastIssuedId = currentTime

  findById: (id) ->
    result = @collection[@idIndex[id]]
    result = angular.copy(result) if result
    result

  findByIds: (ids) ->
    return [] if !ids
    result = Lazy(ids).map((id) => @collection[@idIndex[id]]).toArray()
    result = angular.copy(result) if result
    result

  getAll: (sortColumns) ->
    result = Lazy(angular.copy(@collection))
    result = @sortLazy(result, sortColumns)
    result

  sortLazy: (items, columns) =>
    if !columns && @sortColumn
      columns = @sortColumn

    if columns
      if columns instanceof Array && columns.length == 2
        items.sortBy((item) -> [item[columns[0]], item[columns[1]]])
      else
        items.sortBy((item) -> item[columns])
    else
      items

  getItemsByYear: (column, year, sortColumns) ->
    # TODO: improve the < 10000
    results = Lazy(@collection).filter (item) -> 
      if item[column] < 10000
        item[column] == year
      else
        moment(item[column]).year() == year 
      
    @sortLazy(results, sortColumns)

  insert: (details) =>
    deferred = @$q.defer()
    @correctId(details)
    if !details.id
      id = @getAvailableId()
      details.id = id
      details.createdAt = moment().valueOf()
      details.updatedAt = moment().valueOf()
      @lastInsertedId = details.id
    else if @findById(details.id)
      deferred.reject("ID already exists")
      return

    @itemExtendFunc(details) if @itemExtendFunc
    @collection.push(details)
    @onModified()

    # update index
    @idIndex[details.id] = @collection.length - 1

    # add to log
    @actionsLog.push({action: 'insert', id: details.id, item: details})

    deferred.resolve(details.id)
    deferred.promise

  editById: (details) =>
    deferred = @$q.defer()
    @correctId(details)
    index = @idIndex[details.id]
    throw 'not found' if index == undefined
    item = @collection[index]
    angular.copy(details, item)
    item.updatedAt = moment().valueOf()
    @onModified()

    # add to log
    @actionsLog.push({action: 'update', id: details.id, item: details})

    deferred.resolve()
    deferred.promise

  deleteById: (itemId, loadingProcess) =>
    throw 'not found' if @idIndex[itemId] == undefined
    @collection.splice(@idIndex[itemId], 1)
    delete @idIndex[itemId]
    if !loadingProcess
      @actionsLog.push({action: 'delete', id: itemId})
      @onModified()

  length: =>
    @collection.length

  reset: =>
    @collection = []
    @lastInsertedId = null
    @updatedAt = 0
    @actionsLog = []
    @idIndex = {}
    @lastIssuedId = 0

  correctId: (item) =>
    if item.id && typeof item.id != 'number'
      item.id = parseInt(item.id, 10)

  onModified: =>
    @updatedAt = Date.now()

  # sync actions
  $buildIndex: =>
    indexItem = (result, item, index) -> 
      result[item.id] = index
      result
    @idIndex = Lazy(@collection).reduce(indexItem, {})

  $updateOrSet: (item, updatedAt) =>
    @correctId(item)
    if @idIndex[item.id]?
      @collection[@idIndex[item.id]] = item      
    else
      @collection.push(item)
      @idIndex[item.id] = @collection.length - 1
      
    @extendItem(item)
    if updatedAt > @updatedAt
      @updatedAt = updatedAt

  $deleteItem: (itemId, updatedAt) =>
    @deleteById(itemId, true)
    if updatedAt > @updatedAt
      @updatedAt = updatedAt

  afterLoadCollection: =>
    @collection.forEach (item) =>
      @correctId(item)
    @$buildIndex()
    @migrateIfNeeded()


class window.SimpleCollection
  VERSION = '1.0'

  constructor:  ($q) ->
    @reset()

  getAvailableId: =>
    currentTime = moment().unix()
    if @lastIssuedId >= currentTime
      @lastIssuedId = @lastIssuedId + 1
    else
      @lastIssuedId = currentTime

  version: -> VERSION

  migrateIfNeeded: =>

  reExtendItems: =>

  getAll: =>
    Lazy(@actualCollection).keys()

  has: (key) =>
    !!@actualCollection[key]

  get: (key) =>
    return undefined if !@actualCollection[key]
    angular.copy(@actualCollection[key].value)

  set: (key, value, isLoadingProcess, loadedId) =>
    if @actualCollection[key]
      item = @actualCollection[key]
      item.value = value
      item = @collection[@idIndex[item.id]]
      item.value = value
      @actionsLog.push({action: 'update', id: item.id, item: item}) if !isLoadingProcess
    else
      if isLoadingProcess && loadedId
        newId = loadedId
      else
        newId = @getAvailableId()
      @actualCollection[key] = {id: newId, value: value}
      entry = {id: newId, key: key, value: value}
      @collection.push(entry)
      @actionsLog.push({action: 'insert', id: newId, item:  entry})  if !isLoadingProcess
      @idIndex[newId] = @collection.length - 1
    @onModified() if !isLoadingProcess

  delete: (key, isLoadingProcess) =>
    item = @actualCollection[key]
    throw 'not found' if !item
    index = @idIndex[item.id]
    throw 'not found' if index == undefined
    delete @idIndex[item.id]
    @collection.splice(index, 1)
    delete @actualCollection[key]
    if !isLoadingProcess
      @actionsLog.push({action: 'delete', id: item.id})
      @onModified()

  findOrCreate: (items) =>
    return if !items
    items = [items] if !(items instanceof Array)
    return if !items[0]
    items.forEach (item) =>
      @set(item, true)  

  onModified: =>
    @updatedAt = Date.now()

  correctId: (item) =>
    if item.id && typeof item.id != 'number'
      item.id = parseInt(item.id, 10)

  # sync actions
  reset: =>
    @idIndex = {}
    @collection = []
    @actualCollection = {}
    @actionsLog = []
    @updatedAt = 0
    @lastIssuedId = 0

  $buildIndex: =>
    indexItem = (result, item, index) -> 
      result[item.id] = index
      result
    @idIndex = Lazy(@collection).reduce(indexItem, {})

  $updateOrSet: (item, updatedAt) =>
    @correctId(item)
    @set(item.key, item.value, true, item.id)
    if updatedAt > @updatedAt
      @updatedAt = updatedAt 

  $deleteItem: (itemId, updatedAt) =>
    @delete(itemId, true)
    if updatedAt > @updatedAt
      @updatedAt = updatedAt

  afterLoadCollection: =>
    if @collection instanceof Array
      @collection.forEach (item) =>
        @correctId(item)
      @$buildIndex()
      @collection.forEach (item) =>
        @actualCollection[item.key] = {id: item.id, value: item.value}
    else
      items = @collection
      @collection = []
      Lazy(items).keys().each (key) =>
        @set(key, items[key])
      @actionsLog = []

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

class window.Box
  constructor: ->
    @rows = []
    @rowByHash = {}
  
  addRow: (item) ->
    return if @rowByHash[item]
    row = {columns: {}, totals: {}}
    @rows.push row
    @rowByHash[item] = row
  
  setColumns: (columns, valueTypes) ->
    Lazy(@rows).each (row) ->
      Lazy(columns).each (colValue) ->
        column = row['columns'][colValue] = {}
        column['values'] = {}
        Lazy(valueTypes).each (type) ->
          column['values'][type] ?= new BigNumber(0)
      Lazy(valueTypes).each (type) ->
        row['totals'][type] = new BigNumber(0)
      

  setValues: (row, col, type, value) ->

  addToValue: (row, col, type, value) ->
    return if !row
    if !@rowByHash[row]
      console.log("missing item", row)
      return
    column = @rowByHash[row]['columns'][col]
    column['values'][type] = column['values'][type].plus(value)
    @rowByHash[row]['totals'][type] = @rowByHash[row]['totals'][type].plus(value)
  
  columnAmount: ->
    @rows[0]['values'].length
  
  rowColumnValues: (row) =>
    return [] if !@rowByHash[row]
    Lazy(@rowByHash[row]['columns']).pairs().map((item) -> {column: item[0], values: item[1].values }).toArray()

  rowTotals: (row) =>
    if(!@rowByHash[row])
      return {amount: new BigNumber(0)}
    @rowByHash[row]['totals']
  
  # private
  columnValues = (column) ->
    return 0 if column.blank?
    column['values'] || 0

