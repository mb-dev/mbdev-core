root = {}

describe 'IndexedDbCollection', ->
  releaseQResolve = -> setTimeout((-> root.$rootScope.$apply()), 10)
  beforeEach(module('core.services'))
  beforeEach (done) ->
    inject ($httpBackend, $http, $q, $rootScope) ->
      root.timeNow = Date.now()
      root.$q = $q
      root.$rootScope = $rootScope
      root.db = new Database(root.appName, root.$q, root.storageService, root.userService)
      root.testCollection = new IndexedDbCollection('test', 'items', root.$q)
      root.testCollection.createDatabase({
        items:
          key: { keyPath: 'id' }
          indexes:
            id: {}
            date: {}
            gcalId: {}
      }).then(done)
  afterEach (done) ->
    root.testCollection.clearAll().then -> 
      done()
    , ->
      console.log 'failed to clear all'
  it 'should allow inserting single item', (done) ->
    root.testCollection.insert({name: 'test'}).then ->
      id = root.testCollection.lastIssuedId
      root.testCollection.findById(id).then (result) ->
        expect(result.name).toEqual('test')
        done()
      , -> console.log('fail to find by id')
    , -> console.log('fail to insert item')
  it 'should allow inserting multiple items', (done) ->
    root.testCollection.insertMultiple([{name: 'test1'}, {name: 'test2'}]).then ->
      root.testCollection.getAll().then (results) ->  
        expect(results.length).toEqual(2)
        done()
      , -> console.log('fail to get all')
    , -> console.log('fail to insert multiple items')