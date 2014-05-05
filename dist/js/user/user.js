angular.module('app.controllers').controller('UserLoginController', function($scope, $window, userService, storageService, $location) {
  $scope.user = {};
  $scope.loginOauth = function(site) {
    return $window.location.href = userService.oauthUrl($scope.domain);
  };
  $scope.register = function() {
    return userService.register($scope.user).then(function(successResponse) {
      return $location.path('/login_success');
    }, function(failedResponse) {
      return $scope.error = failedResponse.data.error;
    });
  };
  return $scope.login = function() {
    return userService.login($scope.user).then(function(successResponse) {
      var response;
      response = successResponse.data;
      storageService.setUserDetails(response.user);
      if (storageService.getEncryptionKey()) {
        return $location.path('/welcome');
      } else {
        return $location.path('/key');
      }
    }, function(failedResponse) {
      return $scope.error = "Failed to login: " + failedResponse.data.message;
    });
  };
}).controller('LoginOAuthSuccessController', function($scope, $window, userService, storageService, $location, $routeParams) {
  storageService.setToken($routeParams.token);
  return userService.checkLogin().then(function(successResponse) {
    var response;
    response = successResponse.data;
    storageService.setUserDetails(response.user);
    delete $location.$$search.token;
    if (storageService.getEncryptionKey()) {
      return $location.path('/welcome');
    } else {
      return $location.path('/key');
    }
  }, function(failedResponse) {
    return $location.url($location.path('/login'));
  });
}).controller('UserKeyController', function($scope, $window, storageService, $location, $q) {
  $scope.key = '';
  storageService.setupFilesystem();
  if (!storageService.getUserDetails()) {
    $location.path('/login');
  }
  return $scope.onSubmit = function() {
    storageService.setEncryptionKey($scope.key);
    return storageService.setupFilesystem().then(function() {
      return $location.path('/welcome');
    }, function() {
      return $scope.error = 'Failed to set file system';
    });
  };
}).controller('UserProfileController', function($scope, $window, $location, fdb, mdb) {
  var financeTables, memoryTables;
  financeTables = Object.keys(fdb.tables);
  memoryTables = Object.keys(mdb.tables);
  return $scope.downloadBackup = function() {
    var fetchTables;
    fetchTables = function() {
      return fdb.getTables(financeTables).then(mdb.getTables(memoryTables));
    };
    return fetchTables().then(function() {
      var blob, content, link;
      content = {};
      angular.extend(content, fdb.dumpAllCollections(financeTables));
      angular.extend(content, mdb.dumpAllCollections(memoryTables));
      blob = new Blob([angular.toJson(content)], {
        type: 'application/json'
      });
      link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'financeNg' + moment().valueOf().toString() + '-backup.json';
      document.body.appendChild(link);
      return link.click();
    });
  };
}).controller('UserEditProfileController', function($scope, $window, storageService, $location) {
  return $scope.onSubmit = function() {
    storageService.setEncryptionKey($scope.key);
    return $location.path('/line_items');
  };
}).controller('UserLogoutController', function($scope, $window, storageService, userService, $location) {
  if (storageService.getUserDetails()) {
    return userService.logout().then(function() {
      storageService.onLogout();
      return $location.path('/login');
    });
  } else {
    return $location.path('/login');
  }
});

angular.module('app.services').factory('userService', function($http, storageService, $location) {
  var apiServerUrl;
  if (Lazy($location.host()).contains('local.com')) {
    apiServerUrl = 'http://api.moshebergman.local.com:10000';
  } else if (Lazy($location.host()).contains('vagrant.com')) {
    apiServerUrl = 'http://api.moshebergman.vagrant.com';
  } else {
    apiServerUrl = 'https://api.moshebergman.com';
  }
  return {
    oauthUrl: function(domain) {
      return apiServerUrl + '/auth/google?site=' + domain;
    },
    authenticate: function() {
      return $http.get(apiServerUrl + '/data/authenticate', {
        headers: {
          'Authorization': storageService.getToken()
        }
      });
    },
    readData: function(appName, tableName, readDataFrom) {
      return $http.get(apiServerUrl + ("/data/" + appName + "/" + tableName + "?") + $.param({
        updatedAt: readDataFrom
      }), {
        headers: {
          'Authorization': storageService.getToken()
        }
      });
    },
    writeData: function(appName, tableName, actions, forceServerCleanAndSaveAll) {
      if (forceServerCleanAndSaveAll == null) {
        forceServerCleanAndSaveAll = false;
      }
      return $http.post(apiServerUrl + ("/data/" + appName + "/" + tableName + "?all=" + (!!forceServerCleanAndSaveAll)), actions, {
        headers: {
          'Authorization': storageService.getToken()
        }
      });
    },
    checkLogin: function() {
      return $http.get(apiServerUrl + '/auth/check_login', {
        headers: {
          'Authorization': storageService.getToken()
        }
      });
    },
    register: function(user) {
      return $http.post(apiServerUrl + '/auth/register', user);
    },
    login: function(user) {
      return $http.post(apiServerUrl + '/auth/login', user);
    },
    logout: function() {
      return $http.post(apiServerUrl + '/auth/logout');
    }
  };
});
