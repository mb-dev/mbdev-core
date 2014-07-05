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
