root = {}

makeObject = (id, value) ->
  result = {}
  result[id] = value
  result

describe 'Database', ->
  beforeEach(module('core.services'))
  beforeEach(inject(($httpBackend, $q, $rootScope, userService) ->
    root.timeNow = Date.now()
    root.timeNewerData = root.timeNow + 20
    root.$httpBackend = $httpBackend
    root.$rootScope = $rootScope
    root.appName = 'finance'
    root.userId = '52acfdc87d75a5a83e000001'
    root.fileSystemFileName = root.userId + '-finance-people.json'
    root.tableName = 'people'
    root.authenticateURL = 'https://api.moshebergman.com/auth/check_login'
    root.getLastModifiedUrl = 'https://api.moshebergman.com/data/get_last_modified'
    root.getURL = 'https://api.moshebergman.com/data/finance/people'
    root.authenticateOkResponseDataStale = {user: {id: root.userId, email: 'a@a.com', lastModifiedDate: {'finance-people': root.timeNewerData} }}
    root.authenticateOkResponseDataOk = {user: {id: root.userId, email: 'a@a.com', lastModifiedDate: {'finance-people': root.timeNow} }}
    root.getResponse = {actions: []}
    root.postResponse = {message: 'write_ok', updatedAt: root.timeNewerData}
    root.item = {name: 'Moshe'}
    root.originalName = 'Moshe'    
    root.encryptionKey = "ABC"
    root.storageContent = {
      version: '1.0'
      data: [{id: 1, name: 'Moshe', updatedAt: root.timeNow}],
      updatedAt: root.timeNow
    }
    root.sessionKey = root.appName + '-' + root.tableName
    root.$httpBackend.when('POST', root.postURL).respond(root.postResponse)
    root.$q = $q
    root.$sessionStorage = {}
    root.$localStorage = {}
    root.$localStorage[root.userId + '-encryptionKey'] = root.encryptionKey
    root.fileSystemContent = {}
    root.flushAll = ->
      setTimeout(=> 
        root.$rootScope.$apply()
      , 0)
    root.fileSystem = {
      readFile: (fileName) =>
        defer = root.$q.defer()
        if root.fileSystemContent[fileName]
          defer.resolve(root.fileSystemContent[fileName])
        else
          defer.reject('no_file')
        root.flushAll()
        defer.promise
      writeFile: (fileName, content) =>
        defer = root.$q.defer()
        root.fileSystemContent[fileName] = content
        root.flushAll()
        defer.resolve()
        defer.promise
    }
    root.storageServiceContent = {}
    root.storageService = {
      set: (key, value) =>
        root.storageServiceContent[key] = value
      isUserExists: =>
        !!root.storageServiceContent.user
      getUserDetails: =>
        root.storageServiceContent.user
      setUserDetails: (details) =>
        root.storageServiceContent.user = details
      getLastModifiedDate: (appName, tableName) ->
        user = root.storageServiceContent.user
        return 0 if !user || !user.lastModifiedDate
        user.lastModifiedDate["#{appName}-#{tableName}"] || 0
      setLastModifiedDate: (appName, tableName, updatedAt) => 
        userDetails = root.storageServiceContent.user
        userDetails.lastModifiedDate["#{appName}-#{tableName}"] = updatedAt
        root.storageServiceContent.user = userDetails
      setLastModifiedDateRaw: (data) ->
        root.storageServiceContent.user.lastModifiedDate = data
      getLocalLastSyncDate: (appName, tableName) ->
        syncDate = root.storageServiceContent.syncDate
        return 0 if !syncDate
        syncDate["#{appName}-#{tableName}"] || 0
      setLocalLastSyncDate: (appName, tableName, updatedAt) ->
        syncDate = root.storageServiceContent.syncDate || {}
        syncDate["#{appName}-#{tableName}"] = updatedAt
        root.storageServiceContent.syncDate = syncDate
      getEncryptionKey: =>
        root.encryptionKey
      readFile: (fileName) =>
        root.fileSystem.readFile(fileName)
      writeFile: (fileName, content) =>
        root.fileSystem.writeFile(fileName, content)

    }
    root.remoteContent = []
    root.remoteAuthenticateResponse = null
    root.remoteAuthenticateFailResponse = null
    root.userService = userService
    root.verifyNoMoreOutstandingRequests = ->
      root.$httpBackend.verifyNoOutstandingExpectation();
      root.$httpBackend.verifyNoOutstandingRequest();
  ))
  afterEach (done) ->
    setTimeout -> 
      root.verifyNoMoreOutstandingRequests()
      done()
    , 0
  describe 'getTables when logged in', ->
    beforeEach ->
      root.storageService.set('user', {id: root.userId, email: 'a@a.com', lastModifiedDate: {'finance-people': root.timeNow}})
    it 'should load data from the network when filesystem has no data', (done) ->
      # setup db
      db = new Database(root.appName, root.$q, root.storageService, root.userService)
      testCollection = db.createCollection(root.tableName, new Collection(root.$q, 'name'))
      # setup get data
      root.$httpBackend.when('GET', root.getLastModifiedUrl).respond({lastModifiedDate: root.authenticateOkResponseDataOk.user.lastModifiedDate})
      root.$httpBackend.expectGET(root.getLastModifiedUrl)
      root.getURL += '?updatedAt=0'
      root.getResponse.actions.push { action: 'update', id: 1, item: sjcl.encrypt(root.encryptionKey, angular.toJson(root.storageContent.data[0])), updatedAt: root.timeNow }
      root.$httpBackend.when('GET', root.getURL).respond(root.getResponse)
      root.$httpBackend.expectGET(root.getURL)
      # test      
      db.getTables([root.tableName]).then ->
        expect(testCollection.getAll().toArray()).toEqual([{id: 1, name: 'Moshe', updatedAt: root.timeNow}])
        expect(root.fileSystemContent[root.fileSystemFileName]).toEqual(angular.toJson(root.storageContent))
        done()
      , ->
        expect("Got Error").toFail()
        done()  
      root.$httpBackend.flush()
    it 'should load data from the file system when file system has data', (done) ->
      root.fileSystemContent[root.fileSystemFileName] = angular.toJson(root.storageContent)
      db = new Database(root.appName, root.$q, root.storageService, root.userService)
      testCollection = db.createCollection(root.tableName, new Collection(root.$q, 'name'))
      db.getTables([root.tableName]).then -> 
        expect(testCollection.getAll().toArray()).toEqual([{id: 1, name: 'Moshe', updatedAt: root.timeNow}])
        done()
      , () ->
        expect("got error").toFail()
        done()
  describe 'saveTables', ->
    it 'should save to the server', (done) ->
      # setup user and data
      root.storageService.set('user', {id: root.userId, email: 'a@a.com', lastModifiedDate: {'finance-people': root.timeNow}})
      root.fileSystemContent[root.fileSystemFileName] = angular.toJson(root.storageContent)
      # setup db
      db = new Database(root.appName, root.$q, root.storageService, root.userService)
      testCollection = db.createCollection(root.tableName, new Collection(root.$q, 'name'))
      # get initial data
      db.getTables([root.tableName]).then ->
        # now prepare data to be saved
        testCollection.insert({name: 'David'})
        root.postURL = root.getURL + '?all=false'
        root.$httpBackend.expectPOST(root.postURL)
        # perform test
        db.saveTables([root.tableName]).then -> 
          # expect data to be saved to fs and web
          expect(JSON.parse(root.fileSystemContent[root.fileSystemFileName]).data[1].name).toEqual('David')
          expect(root.storageService.getLastModifiedDate('finance', 'people')).toEqual(root.timeNewerData)
          done()
        , ->
          expect("got error").toFail()
          done()
        setTimeout((->root.$httpBackend.flush()), 0)
      , ->
        expect("got error").toFail()
        done()
      root.$rootScope.$apply()

  describe 'authAndCheckData', ->
    it 'should get data when there is data and the data is stale', (done) ->
      # setup database
      root.storageService.set('user', {id: root.userId, email: 'a@a.com', lastModifiedDate: {'finance-people': root.timeNow}})

      db = new Database(root.appName, root.$q, root.storageService, root.userService)
      testCollection = db.createCollection(root.tableName, new Collection(root.$q, 'name'))
      # user and data in file system
      root.fileSystemContent[root.fileSystemFileName] = angular.toJson(root.storageContent)
      # load from FS
      db.getTables([root.tableName]).then ->
      
        # setup authenticate request
        root.storageService.setLocalLastSyncDate(root.appName, root.tableName, root.timeNow)
        root.$httpBackend.when('GET', root.getLastModifiedUrl).respond({lastModifiedDate: root.authenticateOkResponseDataStale.user.lastModifiedDate})
        root.$httpBackend.expectGET(root.getLastModifiedUrl)
        # setup newer data
        root.getURL += '?updatedAt=' + root.timeNow
        root.getResponse.actions.push { action: 'delete', id: 1, updatedAt: root.timeNow }
        root.getResponse.actions.push { action: 'update', id: 2, item: sjcl.encrypt(root.encryptionKey, angular.toJson({id: 2, name: 'David', updatedAt: root.timeNewerData})), updatedAt: root.timeNewerData }
        root.$httpBackend.when('GET', root.getURL).respond(root.getResponse)
        root.$httpBackend.expectGET(root.getURL)
        # perform test
        promise = db.authAndCheckData([root.tableName]).then -> 
          # check file system does not have the deleted entry and that collection matches the new data
          expect(JSON.parse(root.fileSystemContent[root.fileSystemFileName]).data[0].name).toEqual('David')
          expect(testCollection.getAll().toArray()).toEqual([{id: 2, name: 'David', updatedAt: root.timeNewerData}])
          done()
        , ->
          expect("got error").toFail()
          done()
        setTimeout((->root.$httpBackend.flush()), 0)
      , ->
        expect("got error").toFail()
        done()
    it 'should not get data when there is no stale data', (done) ->
      # setup database
      root.storageService.set 'user', {id: root.userId, email: 'a@a.com', lastModifiedDate: {'finance-people': root.timeNow}}

      db = new Database(root.appName, root.$q, root.storageService, root.userService)
      testCollection = db.createCollection(root.tableName, new Collection(root.$q, 'name'))
      # user and data in file system
      root.fileSystemContent[root.fileSystemFileName] = angular.toJson(root.storageContent)
      # load from FS
      db.getTables([root.tableName]).then ->
        # setup authenticate request
        root.storageService.setLocalLastSyncDate(root.appName, root.tableName, root.timeNow)
        root.$httpBackend.when('GET', root.getLastModifiedUrl).respond({lastModifiedDate: root.authenticateOkResponseDataOk.user.lastModifiedDate})
        root.$httpBackend.expectGET(root.getLastModifiedUrl)
        # perform test
        db.authAndCheckData([root.tableName]).then ->
          # check that collection is still the same
          expect(testCollection.getAll().toArray()).toEqual([{id: 1, name: 'Moshe', updatedAt: root.timeNow}])
          done()
        , ->
          expect("got error").toFail()
          done()
        setTimeout((->root.$httpBackend.flush()), 0)
      , ->
        expect("got error").toFail()
        done()
    it 'should fail when user not authenticated', (done) ->
      resolvedValue = null
      # setup database
      db = new Database(root.appName, root.$q, root.storageService, root.userService)
      testCollection = db.createCollection(root.tableName, new Collection(root.$q, 'name'))
      # perform test
      db.authAndCheckData([root.tableName]).then (value) -> 
        expect("this should have failed").toFail()
        done()  
      , (response) ->
        # check that we failed
        expect(response.data).toEqual({reason: 'not_logged_in'})
        done()
      root.$rootScope.$apply()

describe 'Collection', ->
  beforeEach(module('core.services'))
  beforeEach inject ($httpBackend, $http, $q, $rootScope) ->
    root.timeNow = Date.now()
    root.db = new Database(root.appName, root.$q, root.storageService, root.userService)
    root.testCollection = root.db.createCollection(root.tableName, new Collection(root.$q, 'id'))
  describe 'updateAndSet', ->
    it 'should not add new item when it was only updated', ->
      root.testCollection.insert({name: 'Daniel'})  
      root.$rootScope.$apply()
      root.testCollection.afterLoadCollection()  
      root.testCollection.$updateOrSet(root.testCollection.collection[0], root.testCollection.collection[0].updatedAt + 1)
      expect(root.testCollection.collection.length).toEqual(1)
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

describe 'Box', ->
  it 'should allow setting values', ->
    item = {name: 'Groceries'}
    box = new Box()
    box.addRow(item)
    box.setColumns([0..11], ['expense', 'future_expense', 'planned_expense'])
    box.addToValue(item, 0, 'expense', 100)
    box.addToValue(item, 1, 'expense', 100)

    firstColumnValue = box.rowColumnValues(item)[0]
    expect(firstColumnValue.column).toEqual('0')
    expect(firstColumnValue.values.expense.toFixed(0)).toEqual('100')

    totals = box.rowTotals(item)
    expect(totals['expense'].toFixed(0)).toEqual('200')