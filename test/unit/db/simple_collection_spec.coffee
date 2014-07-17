root = {}

describe 'SimpleCollection', ->
  beforeEach(module('core.services'))
  beforeEach inject ($httpBackend, $http, $q, $rootScope) ->
    root.timeNow = Date.now()
    root.db = new Database(root.appName, root.$q, root.storageService, root.userService)
    root.testCollection = root.db.createCollection(root.tableName, new SimpleCollection(root.$q))
  it 'should insert item', ->
    root.testCollection.findOrCreate('item')
    root.itemId = root.testCollection.lastIssuedId
    expect(root.testCollection.actionsLog).toEqual( [{ action: 'insert', id: root.itemId, item: { id: root.itemId, key: 'item', value: true } }] )
    expect(root.testCollection.idIndex).toEqual(makeObject(root.itemId, 0))
  it 'should update simple item', ->
    root.testCollection.findOrCreate('item')
    root.itemId = root.testCollection.lastIssuedId
    root.testCollection.findOrCreate('item')
    expect(root.testCollection.actionsLog[1]).toEqual( { action: 'update', id: root.itemId, item: { id: root.itemId, key: 'item', value: true } } )
    expect(root.testCollection.collection.length).toEqual(1)
  it 'should update actual item', ->
    root.testCollection.set('item', 'value1')
    root.itemId = root.testCollection.lastIssuedId
    root.testCollection.set('item', 'value2')
    expect(root.testCollection.actionsLog[1]).toEqual( { action: 'update', id: root.itemId, item: { id: root.itemId, key: 'item', value: 'value2' } } )
    expect(root.testCollection.collection[0].value).toEqual('value2')
    expect(root.testCollection.actualCollection['item'].value).toEqual('value2')
  it 'should delete item', ->
    root.testCollection.findOrCreate('item')
    root.testCollection.delete('item')
    root.itemId = root.testCollection.lastIssuedId
    expect(root.testCollection.actionsLog[1]).toEqual( { action: 'delete', id: root.itemId} )
    expect(root.testCollection.idIndex).toEqual({})
    expect(root.testCollection.get('test')).toEqual(undefined)
  it 'should support loading collection', ->
    root.testCollection.collection = [{id: 1, key: 'item', value: true}]
    root.testCollection.afterLoadCollection()
    expect(root.testCollection.get('item')).toEqual(true)
    expect(root.testCollection.idIndex).toEqual({1: 0})
    expect(root.testCollection.actionsLog.length).toEqual( 0 )
  it 'should accept transform add and delete item', ->
    root.testCollection.collection = [{id: 1, key: 'item', value: true}]
    root.testCollection.afterLoadCollection()
    root.testCollection.$updateOrSet({id: 2, key: 'item2', value: true}, root.timeNow-10)
    root.testCollection.$deleteItem('item', root.timeNow)
    expect(root.testCollection.updatedAt).toEqual(root.timeNow)
    expect(root.testCollection.collection.length).toEqual(1)
    expect(root.testCollection.get('item')).toEqual(undefined)
    expect(root.testCollection.get('item2')).toEqual(true)
