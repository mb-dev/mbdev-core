root = {}
describe 'Collection', ->
  beforeEach(module('core.services'))
  beforeEach inject ($httpBackend, $http, $q, $rootScope, storageService, userService) ->
    root.$rootScope = $rootScope
    root.timeNow = Date.now()
    root.storageService = storageService
    root.userService = userService
    root.$q = $q
    root.db = new Database(root.appName, root.$q, root.storageService, root.userService)
    root.testCollection = root.db.createCollection(root.tableName, new Collection(root.$q, 'id'))
  describe 'deleteById', ->
    it 'should delete two items', ->
      root.testCollection.insert({name: 'Moshe'})
      firstId = root.testCollection.lastInsertedId
      root.testCollection.insert({name: 'David'})
      secondId = root.testCollection.lastInsertedId
      root.$rootScope.$apply()
      root.testCollection.deleteById(firstId)
      root.testCollection.deleteById(secondId)
      expect(root.testCollection.collection.length).toEqual(0)
  describe 'updateAndSet', ->
    it 'should not add new item when it was only updated', ->
      root.testCollection.insert({name: 'Daniel'})  
      root.$rootScope.$apply()
      root.testCollection.afterLoadCollection()  
      root.testCollection.$updateOrSet(root.testCollection.collection[0], root.testCollection.collection[0].updatedAt + 1)
      expect(root.testCollection.collection.length).toEqual(1)