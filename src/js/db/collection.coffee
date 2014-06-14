class window.Collection extends Syncable
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

    # update index
    @idIndex[details.id] = @collection.length - 1

    # add to log
    @onInsert(details)

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
    
    @onEdit(details)

    deferred.resolve()
    deferred.promise

  deleteById: (itemId, loadingProcess) =>
    throw 'not found' if @idIndex[itemId] == undefined
    @collection.splice(@idIndex[itemId], 1)
    @$buildIndex()
    if !loadingProcess
      @onDelete(itemId)

  length: =>
    @collection.length

  reset: =>
    super
    @collection = []
    @lastInsertedId = null
    @idIndex = {}

  correctId: (item) =>
    if item.id && typeof item.id != 'number'
      item.id = parseInt(item.id, 10)

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