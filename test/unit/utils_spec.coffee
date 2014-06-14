root = {}

describe 'storageService', ->
  beforeEach(module('core.services'))
  beforeEach ->
    module ($provide) -> 
      root.memory = {}
      root.memory.localStorage = {}
      $provide.factory 'localStorageWrapper', ->
        {
          set: (key, value) ->
            root.memory.localStorage[key] = value
          get: (key) ->
            root.memory.localStorage[key]
        }
      null
    inject (storageService) ->
      root.storageService = storageService
      
  describe 'isAuthenticateTimeAndSet', ->
    it 'should return true the first time and false the other', ->
      expect(root.storageService.isAuthenticateTimeAndSet()).toEqual(true)
      expect(root.storageService.isAuthenticateTimeAndSet()).toEqual(false)
      
