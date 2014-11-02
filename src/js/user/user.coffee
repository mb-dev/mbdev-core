angular.module('core.controllers', [])
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
    tables = Object.keys(db.tables)

    if !storageService.getUserDetails()
      $location.path('/')

    $scope.onSubmit = ->
      storageService.setEncryptionKey($scope.key)
      $location.path('/welcome')

  .controller 'UserProfileController', ($scope, $window, $location, $injector, db) ->
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

    $scope.checkNewData = ->
      db.authAndCheckData(tables).then ->
        $scope.showSuccess("Latest data was received from the server")
    $scope.forceReload = ->
      db.getTables(tables, true).then ->
        $scope.showSuccess("All data was received from the server")

  .controller 'UserEditProfileController', ($scope, $window, storageService, $location) ->
    $scope.onSubmit = ->
      storageService.setEncryptionKey($scope.key)
      $location.path('/line_items')

  .controller 'UserLogoutController', ($scope, $window, storageService, userService, $location) ->
    if storageService.getUserDetails()
      storageService.onLogout()
    $location.path('/')
