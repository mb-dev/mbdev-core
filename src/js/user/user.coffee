angular.module('app.controllers')
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
          $location.path('/welcome')
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
        $location.path('/welcome')
      else
        $location.path('/key')
    , (failedResponse) ->
        $location.url($location.path '/login')

  .controller 'UserKeyController', ($scope, $window, storageService, $location, $q) ->
    $scope.key = ''
    storageService.setupFilesystem()

    if !storageService.getUserDetails()
      $location.path('/login')

    $scope.onSubmit = ->
      storageService.setEncryptionKey($scope.key)
      storageService.setupFilesystem().then ->
        $location.path('/welcome')
      , () ->
        $scope.error = 'Failed to set file system'

  .controller 'UserProfileController', ($scope, $window, $location, fdb, mdb) ->
    financeTables = Object.keys(fdb.tables)
    memoryTables = Object.keys(mdb.tables)
    $scope.downloadBackup = ->
      fetchTables = -> fdb.getTables(financeTables).then(mdb.getTables(memoryTables))
      
      fetchTables().then ->
        content = {}
        angular.extend(content, fdb.dumpAllCollections(financeTables))
        angular.extend(content, mdb.dumpAllCollections(memoryTables))

        blob = new Blob([angular.toJson(content)], {type: 'application/json'})

        link = document.createElement('a')
        link.href = window.URL.createObjectURL(blob)
        link.download = 'financeNg' + moment().valueOf().toString() + '-backup.json'
        document.body.appendChild(link)
        link.click()

  .controller 'UserEditProfileController', ($scope, $window, storageService, $location) ->
    $scope.onSubmit = ->
      storageService.setEncryptionKey($scope.key)
      $location.path('/line_items')

  .controller 'UserLogoutController', ($scope, $window, storageService, userService, $location) ->
    if storageService.getUserDetails()
      userService.logout().then ->
        storageService.onLogout()
        $location.path('/login')
    else      
      $location.path('/login')

angular.module('app.services')
  .factory 'userService', ($http, storageService, $location) ->
    if Lazy($location.host()).contains('local.com')
      apiServerUrl = 'http://api.moshebergman.local.com:10000'
    else
      apiServerUrl = 'https://api.moshebergman.com'
    {
      oauthUrl: (domain) ->
        apiServerUrl + '/auth/google?site=' + domain
      authenticate: ->
        $http.get(apiServerUrl + '/data/authenticate', {headers: {'Authorization': storageService.getToken() }})
      readData: (appName, tableName, readDataFrom) ->
        $http.get(apiServerUrl + "/data/#{appName}/#{tableName}?" + $.param({updatedAt: readDataFrom}), {headers: {'Authorization': storageService.getToken() }})
      writeData: (appName, tableName, actions, forceServerCleanAndSaveAll = false) ->
        $http.post("/data/#{appName}/#{tableName}?all=#{!!forceServerCleanAndSaveAll}", actions, {headers: {'Authorization': storageService.getToken() }})
      checkLogin: ->
        $http.get(apiServerUrl + '/auth/check_login', {headers: {'Authorization': storageService.getToken() }})
      register: (user) ->
        $http.post(apiServerUrl + '/auth/register', user)
      login: (user) ->
        $http.post(apiServerUrl + '/auth/login', user)
      logout: ->
        $http.post(apiServerUrl + '/auth/logout')
      }
