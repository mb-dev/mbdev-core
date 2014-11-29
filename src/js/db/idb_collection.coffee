class window.IndexedDbCollection extends Syncable
  constructor: (appName, collectionName, sortColumn) ->
    @collectionName = collectionName
    @appName = appName
    @sortColumn = sortColumn
    @reset()

  getAvailableId: =>
    currentTime = moment().unix()
    if @lastIssuedId >= currentTime
      @lastIssuedId = @lastIssuedId + 1
    else
      @lastIssuedId = currentTime

  stripItem: (item) ->
    newItem = {}
    newItem[key] = value for key,value of item when key[0] != '$'
    newItem

  createDatabase: (dbSchema, version) =>
    version = 1 if !version
    db.open({
      server: @appName,
      version: version,
      schema: dbSchema
    }).then (client) =>
      @dba = client
    , logError
    
  
  insert: (item, loadingProcess) =>
    new RSVP.Promise (resolve, reject) =>
      @beforeInsert(item)
      item = @stripItem(item)
      @dba[@collectionName].add(item).then =>
        @onInsert(item) if !loadingProcess
        resolve()
      , reject

  insertMultiple: (items) =>
    new RSVP.Promise (resolve, reject) =>
      items.map(@stripItem).forEach(@beforeInsert)
      @dba[@collectionName].add.apply(@dba, items).then =>
        items.forEach (item) =>
          @onInsert(item)
        resolve()
      , reject

  clearAll: =>
    new RSVP.Promise (resolve, reject) =>
      @reset()
      @dba[@collectionName].clear().then(resolve, reject)

  getAll: =>
    @dba[@collectionName].query().all().execute()

  getItemsCount: =>
    new RSVP.Promise (resolve, reject) =>
      @dba.query(@collectionName, 'id').all().distinct().count().execute().then(resolve, reject)

  findById: (id) =>
    new RSVP.Promise (resolve, reject) =>
      if !id
        resolve()
      else
        try
          @dba[@collectionName].query('id').only(id).execute().then (results) =>
            resolve(results[0])
          , reject
        catch
          resolve(null)

  findByIds: (ids) =>
    promises = ids.map (id) => @findById(id)
    RSVP.all(promises)

  updateById: (item, loadingProcess) =>
    new RSVP.Promise (resolve, reject) =>
      item = @stripItem(item)
      @dba[@collectionName].update(item).then =>
        @onEdit(item) if !loadingProcess
        resolve()
      , reject
        
  deleteById: (itemId, loadingProcess) =>
    new RSVP.Promise (resolve, reject) =>
      @dba[@collectionName].remove(itemId).then =>
        @onDelete(itemId) if !loadingProcess
        resolve()
      , reject
      

  # utilities

  sortLazy: (items, columns) =>
    if !columns && @sortColumn
      columns = @sortColumn

    if columns
      _.sortBy(items, columns)
    else
      items

  # private

  reset: =>
    super
    @lastInsertedId = null
    @updatedAt = 0
  
  beforeInsert:(details) =>
    if !details.id
      id = @getAvailableId()
      details.id = id
      details.createdAt = moment().valueOf()
      details.updatedAt = moment().valueOf()
      @lastInsertedId = details.id

  $updateOrSet: (item, updatedAt) =>
    promise = null
    @findById(item.id).then (existingItem) =>
      if existingItem
        promise = @updateById(item, true)
      else
        promise = @insert(item, true)
      
      if updatedAt > @updatedAt
        @updatedAt = updatedAt
      promise.then ->
        a = 1
      , (err) -> 
        console.log err.stack
    , (err) =>
      console.log err, @collectionName, item
      console.log err.stack

  $deleteItem: (itemId, updatedAt) =>
    promise = @deleteById(itemId, true)
    if updatedAt > @updatedAt
      @updatedAt = updatedAt
    promise

  afterLoadCollection: =>
    deferred = RSVP.defer()
    deferred.resolve()
    deferred.promise
