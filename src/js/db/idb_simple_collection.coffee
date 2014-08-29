class window.IndexedDbSimpleCollection extends IndexedDbCollection
  findOrCreate: (items) =>
    new RSVP.Promise (resolve, reject) =>       
      if(!items)
        resolve()
        return
      items = [items] if !(items instanceof Array)
      if(!items[0]) 
        resolve()
        return
      promises = items.map (item) => @set(item, true)  
      RSVP.all(promises).then(resolve).catch(reject)

  set: (key, value) =>    
    if @actualCollection[key]
      item = @actualCollection[key]
      item.value = value
      @updateById(item)
    else
      newId = @getAvailableId()
      @actualCollection[key] = {id: newId, key: key, value: value}
      @insert(@actualCollection[key])

  deleteKey: (key) =>
    item = @actualCollection[key]
    @deleteById(item.id).then =>
      delete @actualCollection[key]

  reset: =>
    super
    @actualCollection = {}

  afterLoadCollection: =>
    promise = super
    promise.then =>
      @rebuildIndex()
    
  rebuildIndex: =>
    new RSVP.Promise (resolve, reject) =>       
      @dba[@collectionName].query().all().execute().then (items) =>
        @actualCollection = {}
        items.forEach (item) =>
          @actualCollection[item.key] = item
        resolve()
      , reject
