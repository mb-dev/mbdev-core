root = {}

makeObject = (id, value) ->
  result = {}
  result[id] = value
  result

fail = (msg) ->
  (err) ->
    console.log 'failed to run method!', err

describe 'IndexedDbSimpleCollection', ->
  beforeEach (done) ->
    root.timeNow = Date.now()
    root.testCollection = new IndexedDbSimpleCollection('test', 'categories')
    root.testCollection.createDatabase({
      items:
        key: { keyPath: 'id' }
        indexes:
          id: {}
          date: {}
          gcalId: {}
      categories:
        key: { keyPath: 'id' }
        indexes:
          id: {}
    }).then(done)
  afterEach (done) ->
    root.testCollection.clearAll().then(done
    , ->
      console.log 'failed to clear all'
    )

  it 'should insert item', (done) ->
    root.testCollection.findOrCreate('item').then ->
      root.itemId = root.testCollection.lastIssuedId
      expect(root.testCollection.actionsLog).toEqual( [{ action: 'insert', id: root.itemId, item: { id: root.itemId, key: 'item', value: true } }] )
      expect(root.testCollection.actualCollection).toEqual(makeObject('item', { id: root.itemId, key: 'item', value : true }))
      done()
    , fail('should insert item - failed to findOrCreate')
  it 'should update simple item', (done) ->
    root.testCollection.findOrCreate('item').then ->
      root.itemId = root.testCollection.lastIssuedId
      return root.testCollection.findOrCreate('item')
    , fail('failed to findOrCreate')
    .then ->
      expect(root.testCollection.actionsLog[1]).toEqual( { action: 'update', id: root.itemId, item: { id: root.itemId, key: 'item', value: true } } )
      expect(root.testCollection.actualCollection).toEqual(makeObject('item', { id: root.itemId, key: 'item', value : true }))
      root.testCollection.getAll()
    , fail('failed to getAll')
    .then (results) ->
      expect(results.length).toEqual(1)
      console.log 'done'
      done()
  it 'should update actual item', (done) ->
    root.testCollection.set('item', 'value1').then ->
      root.itemId = root.testCollection.lastIssuedId
      root.testCollection.set('item', 'value2')
    , fail('failed to set')
    .then ->
      root.testCollection.getAll()
    , fail('failed to set')
    .then (results) ->
      expect(root.testCollection.actionsLog[1]).toEqual( { action: 'update', id: root.itemId, item: {id: root.itemId, key: 'item', value: 'value2'}})
      expect(results[0].value).toEqual('value2')
      expect(root.testCollection.actualCollection).toEqual(makeObject('item', {id: root.itemId, key: 'item', value: 'value2'}))
      done()
    , fail('failed to get results')
  it 'should delete item', (done) ->
    root.testCollection.findOrCreate('item').then ->
      root.testCollection.deleteKey('item')
    , fail('failed to findOrCreate')
    .then ->
      root.itemId = root.testCollection.lastIssuedId
      expect(root.testCollection.actionsLog[1]).toEqual( { action: 'delete', id: root.itemId} )
      root.testCollection.getAll()
    , fail('failed to deleteKey')
    .then (results) ->
      expect(results.length).toEqual(0)
      done()
    , fail('failed to get results')
  it 'should support loading collection', (done) -> 
    root.testCollection.set('item', 'value1').then ->
      root.itemId = root.testCollection.lastIssuedId
      root.testCollection.reset()
      root.testCollection.afterLoadCollection()
    , fail('failed to set')
    .then ->
      expect(root.testCollection.actualCollection['item']).toEqual({id: root.itemId, key: 'item', value: 'value1'})
      done()
    , fail('failed to afterLoadCollection')