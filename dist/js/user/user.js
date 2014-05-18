angular.module('core.controllers', []).controller('UserLoginController', function($scope, $window, userService, storageService, $location) {
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
        return $location.path('/');
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
      return $location.path('/');
    } else {
      return $location.path('/key');
    }
  }, function(failedResponse) {
    return $location.url($location.path('/'));
  });
}).controller('UserKeyController', function($scope, $window, storageService, $location, $q, db) {
  $scope.key = '';
  storageService.setupFilesystem();
  if (!storageService.getUserDetails()) {
    $location.path('/');
  }
  return $scope.onSubmit = function() {
    storageService.setEncryptionKey($scope.key);
    return storageService.setupFilesystem().then(function() {
      return db.createAllFiles().then(function() {
        return $location.path('/welcome');
      }, function() {
        return $scope.error = 'Failed to set file system';
      });
    }, function() {
      return $scope.error = 'Failed to set file system';
    });
  };
}).controller('UserProfileController', function($scope, $window, $location, $injector) {
  var db, tables;
  db = $injector.get('fdb') || $injector.get('mdb');
  tables = Object.keys(db.tables);
  $scope.downloadBackup = function() {
    return db.getTables(tables).then(function() {
      var blob, content, link;
      content = {};
      angular.extend(content, db.dumpAllCollections(tables));
      blob = new Blob([angular.toJson(content)], {
        type: 'application/json'
      });
      link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = $scope.domain + '-' + moment().valueOf().toString() + '-backup.json';
      document.body.appendChild(link);
      return link.click();
    });
  };
  return $scope.forceReload = function() {
    return db.getTables(tables, true).then(function() {
      return $scope.showSuccess("Latest data was received from the server");
    });
  };
}).controller('UserEditProfileController', function($scope, $window, storageService, $location) {
  return $scope.onSubmit = function() {
    storageService.setEncryptionKey($scope.key);
    return $location.path('/line_items');
  };
}).controller('UserLogoutController', function($scope, $window, storageService, userService, $location) {
  if (storageService.getUserDetails()) {
    storageService.onLogout();
  }
  return $location.path('/');
});
