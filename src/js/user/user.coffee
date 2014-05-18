angular.module('core.controllers', [])
   .controller 'UserLoginController', ($scope, $window, userService, storageService, $location) ->
    $scope.user = {}

    $scope.loginOauth = (site) ->
      $window.location.href = userService.oauthUrl($scope.domain)

    $scope.register = ->
      userService.register($scope.user).then (successResponse) ->
        $location.path('/login_success')
      , (failedResponse) ->
        $scope.error = failedResponse.data.error

    $scope.login = ->
      userService.login($scope.user).then (successResponse) ->
        response = successResponse.data
        storageService.setUserDetails(response.user)
        if storageService.getEncryptionKey()
          $location.path('/')
        else
          $location.path('/key')
      , (failedResponse) ->
        $scope.error = "Failed to login: " + failedResponse.data.message      

  .controller 'LoginOAuthSuccessController', ($scope, $window, userService, storageService, $location, $routeParams) ->
    storageService.setToken($routeParams.token)
    userService.checkLogin().then (successResponse) ->
      response = successResponse.data
      storageService.setUserDetails(response.user)
      delete $location.$$search.token;
      if storageService.getEncryptionKey()
        $location.path('/')
      else
        $location.path('/key')
    , (failedResponse) ->
        $location.url($location.path '/')

  .controller 'UserKeyController', ($scope, $window, storageService, $location, $q, db) ->
    $scope.key = ''
    storageService.setupFilesystem()

    if !storageService.getUserDetails()
      $location.path('/')

    $scope.onSubmit = ->
      storageService.setEncryptionKey($scope.key)
      storageService.setupFilesystem().then -> 
        db.createAllFiles().then ->
          $location.path('/welcome')
        , () ->
          $scope.error = 'Failed to set file system'
      , () ->
        $scope.error = 'Failed to set file system'

  .controller 'UserProfileController', ($scope, $window, $location, $injector) ->
    db = $injector.get('fdb') || $injector.get('mdb')
    tables = Object.keys(db.tables)
    $scope.downloadBackup = ->      
      db.getTables(tables).then ->
        content = {}
        angular.extend(content, db.dumpAllCollections(tables))

        blob = new Blob([angular.toJson(content)], {type: 'application/json'})

        link = document.createElement('a')
        link.href = window.URL.createObjectURL(blob)
        link.download = $scope.domain + '-' + moment().valueOf().toString() + '-backup.json'
        document.body.appendChild(link)
        link.click()

    $scope.forceReload = ->
      db.getTables(tables, true).then ->
        $scope.showSuccess("Latest data was received from the server")

  .controller 'UserEditProfileController', ($scope, $window, storageService, $location) ->
    $scope.onSubmit = ->
      storageService.setEncryptionKey($scope.key)
      $location.path('/line_items')

  .controller 'UserLogoutController', ($scope, $window, storageService, userService, $location) ->
    if storageService.getUserDetails()
      storageService.onLogout()
    $location.path('/')
