angular.module('app.services').factory('errorReporter', function() {
  return {
    errorCallbackToScope: function($scope) {
      return function(reason) {
        return $scope.error = "failure for reason: " + reason;
      };
    }
  };
}).factory('storageService', function($q) {
  var appDetails;
  appDetails = {};
  return {
    isAuthenticateTimeAndSet: function() {
      var shouldAuthenticate;
      shouldAuthenticate = false;
      if (!amplify.store('lastAuthenticateTime') || moment().diff(moment(amplify.store('lastAuthenticateTime')), 'hours') > 1) {
        shouldAuthenticate = true;
      }
      if (shouldAuthenticate) {
        amplify.store('lastAuthenticateTime', moment().toISOString());
      }
      return shouldAuthenticate;
    },
    getUserDetails: function() {
      return amplify.store('user');
    },
    setAppName: function(appName, appDomain) {
      appDetails = {
        appName: appName,
        appDomain: appDomain
      };
      return amplify.store('appDetails', appDetails);
    },
    isUserExists: function() {
      return !!amplify.store('user');
    },
    setUserDetails: function(userDetails) {
      return amplify.store('user', userDetails);
    },
    setLastModifiedDate: function(appName, tableName, updatedAt) {
      return amplify.store('user').lastModifiedDate["" + appName + "-" + tableName] = updatedAt;
    },
    getEncryptionKey: function() {
      var userId;
      userId = amplify.store('user').id;
      if (!userId) {
        return null;
      }
      return amplify.store("" + userId + "-encryptionKey");
    },
    setEncryptionKey: function(encryptionKey) {
      var userId;
      userId = amplify.store('user').id;
      if (!userId) {
        return;
      }
      return amplify.store("" + userId + "-encryptionKey", encryptionKey);
    },
    onLogout: function() {
      var userId;
      userId = amplify.store('user').id;
      if (!userId) {
        return;
      }
      amplify.store("" + userId + "-encryptionKey", null);
      return amplify.store('user', null);
    },
    getToken: function() {
      return amplify.store("auth-token");
    },
    setToken: function(token) {
      return amplify.store("auth-token", token);
    },
    getSuccessMsg: function() {
      return amplify.store.sessionStorage('successMsg');
    },
    setSuccessMsg: function(msg) {
      return amplify.store.sessionStorage('successMsg', msg);
    },
    getNoticeMsg: function() {
      return amplify.store.sessionStorage('noticeMsg');
    },
    setNoticeMsg: function(msg) {
      return amplify.store.sessionStorage('noticeMsg', msg);
    },
    clearMsgs: function() {
      amplify.store.sessionStorage('successMsg', null);
      return amplify.store.sessionStorage('noticeMsg', null);
    },
    readFile: function(fileName) {
      var defer;
      defer = $q.defer();
      this.setupFilesystem().then(function(config) {
        return config.filer.open('/db/ ' + fileName, function(file) {
          var reader;
          reader = new FileReader();
          reader.onload = function(e) {
            return defer.resolve(reader.result);
          };
          return read.readAsArrayBuffer(file);
        }, function(err) {
          return defer.reject(err);
        });
      });
      return defer.promise;
    },
    writeFile: function(fileName, content) {
      var defer;
      defer = $q.defer();
      this.setupFilesystem().then(function(config) {
        return config.filer.write('/db/' + fileName, {
          data: content,
          type: 'text/plain'
        }, function(fileEntry, fileWriter) {
          return defer.resolve(config);
        }, function(err) {
          return defer.reject(err);
        });
      }, function(err) {
        return defer.reject(err);
      });
      return defer.promise;
    },
    setupFilesystem: function() {
      var defer, filer;
      defer = $q.defer();
      filer = new Filer();
      filer.init({
        persistent: true,
        size: 1024 * 1024 * 50
      }, function(fs) {
        return filer.mkdir('/db', false, function(dirEntry) {
          return defer.resolve({
            fs: fs,
            filer: filer
          });
        }, function(err) {
          return defer.reject(err);
        });
      }, function(err) {
        return defer.reject(err);
      });
      return defer.promise;
    }
  };
});

angular.module('app.directives').directive('currencyWithSign', function($filter) {
  return {
    restrict: 'E',
    link: function(scope, elm, attrs) {
      var currencyFilter;
      currencyFilter = $filter('currency');
      return scope.$watch(attrs.amount, function(value) {
        if (typeof value !== 'string') {
          value = value.toString();
        }
        if (typeof value === 'undefined' || value === null) {
          return elm.html('');
        } else if (value[0] === '-') {
          return elm.html('<span class="negative">' + currencyFilter(value) + '</span>');
        } else {
          return elm.html('<span class="positive">' + currencyFilter(value) + '</span>');
        }
      });
    }
  };
}).directive('dateFormat', function($filter) {
  var dateFilter;
  dateFilter = $filter('localDate');
  return {
    require: 'ngModel',
    link: function(scope, element, attr, ngModelCtrl) {
      ngModelCtrl.$formatters.unshift(function(value) {
        if (value) {
          return dateFilter(value);
        } else {
          return '';
        }
      });
      return ngModelCtrl.$parsers.push(function(value) {
        if (value) {
          return moment(value).valueOf();
        } else {
          return null;
        }
      });
    }
  };
}).directive('floatToString', function($filter) {
  return {
    require: 'ngModel',
    link: function(scope, element, attr, ngModelCtrl) {
      ngModelCtrl.$formatters.unshift(function(value) {
        if (!value) {
          return 0;
        }
        return parseFloat(value);
      });
      return ngModelCtrl.$parsers.push(function(value) {
        return value.toString();
      });
    }
  };
}).directive('typeFormat', function($filter) {
  var typeFilter;
  typeFilter = $filter('typeString');
  return {
    require: 'ngModel',
    link: function(scope, element, attr, ngModelCtrl) {
      ngModelCtrl.$formatters.unshift(function(value) {
        return typeFilter(value);
      });
      return ngModelCtrl.$parsers.push(function(value) {
        if (value === 'Expense') {
          return LineItemCollection.EXPENSE;
        } else {
          return LineItemCollection.INCOME;
        }
      });
    }
  };
}).directive('numbersOnly', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, modelCtrl) {
      return modelCtrl.$parsers.push(function(inputValue) {
        return parseInt(inputValue, 10);
      });
    }
  };
}).directive('pickadate', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      var initialized;
      initialized = false;
      return scope.$watch(function() {
        return ngModel.$modelValue;
      }, function(newValue) {
        if (newValue && !initialized) {
          element.pickadate({
            format: 'mm/dd/yyyy'
          });
          return initialized = true;
        }
      });
    }
  };
}).directive("fileread", function() {
  return {
    scope: {
      fileread: "="
    },
    link: function(scope, element, attributes) {
      return element.bind("change", function(changeEvent) {
        return scope.$apply(function() {
          return scope.fileread = changeEvent.target.files[0];
        });
      });
    }
  };
}).directive('ngConfirmClick', function() {
  return {
    link: function(scope, element, attr) {
      var clickAction, msg;
      msg = attr.ngConfirmClick || "Are you sure?";
      clickAction = attr.confirmedClick;
      return element.bind('click', function(event) {
        if (window.confirm(msg)) {
          return scope.$eval(clickAction);
        }
      });
    }
  };
}).directive('autoresize', function($window) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var offset, resize;
      offset = !$window.opera ? element[0].offsetHeight - element[0].clientHeight : element[0].offsetHeight + parseInt($window.getComputedStyle(element[0], null).getPropertyValue('border-top-width'));
      resize = function(el) {
        el.style.height = 'auto';
        return el.style.height = (el.scrollHeight + offset) + 'px';
      };
      element.bind('input', function() {
        return resize(element[0]);
      });
      return element.bind('keyup', function() {
        return resize(element[0]);
      });
    }
  };
}).directive('selectize', function($timeout) {
  return {
    restrict: 'A',
    require: '?ngModel',
    link: function(scope, element, attrs, ngModel) {
      return $timeout(function() {
        var allItems, alteredAllItems, selectedItem;
        if (attrs.selectize === 'stringsWithCreate') {
          allItems = scope.$eval(attrs.allItems);
          if (allItems) {
            alteredAllItems = allItems.map(function(item) {
              return {
                value: item,
                text: item
              };
            });
            if (!attrs.multiple) {
              selectedItem = ngModel.$modelValue;
              if (selectedItem && allItems.indexOf(selectedItem) < 0) {
                alteredAllItems.push({
                  value: selectedItem,
                  text: selectedItem
                });
              }
            }
          }
          return $(element).selectize({
            plugins: ['restore_on_backspace'],
            persist: false,
            createOnBlur: true,
            sortField: 'text',
            options: alteredAllItems,
            create: function(input) {
              return {
                value: input,
                text: input
              };
            }
          });
        } else if (attrs.selectize === 'objectsWithIdName') {
          ngModel.$parsers.push(function(value) {
            return value.map(function(item) {
              return parseInt(item, 10);
            });
          });
          allItems = scope.$eval(attrs.allItems);
          return $(element).selectize({
            create: false,
            valueField: 'id',
            labelField: 'name',
            searchField: 'name'
          });
        }
      });
    }
  };
});

angular.module('app.filters').filter('localDate', function($filter) {
  var angularDateFilter;
  angularDateFilter = $filter('date');
  return function(theDate) {
    return angularDateFilter(theDate, 'MM/dd/yyyy');
  };
}).filter('monthDay', function($filter) {
  var angularDateFilter;
  angularDateFilter = $filter('date');
  return function(theDate) {
    return angularDateFilter(theDate, 'MM/dd');
  };
}).filter('percent', function() {
  return function(value) {
    return value + '%';
  };
}).filter('mbCurrency', function($filter) {
  var angularCurrencyFilter;
  angularCurrencyFilter = $filter('currency');
  return function(number) {
    var result;
    result = angularCurrencyFilter(number);
    if (result[0] === '(') {
      return '-' + result.slice(1, -1);
    } else {
      return result;
    }
  };
}).filter('typeString', function($filter) {
  return function(typeInt) {
    if (typeInt === LineItemCollection.EXPENSE) {
      return 'Expense';
    } else {
      return 'Income';
    }
  };
}).filter('bnToFixed', function($window) {
  return function(value, format) {
    if (typeof value === 'undefined' || value === null) {
      return '';
    }
    return value.toFixed(2);
  };
}).filter('joinBy', function() {
  return function(input, delimiter) {
    return (input || []).join(delimiter || ', ');
  };
}).filter('newline', function($sce) {
  return function(string) {
    if (!string) {
      return '';
    }
    return $sce.trustAsHtml(string.replace(/\n/g, '<br/>'));
  };
}).filter('encodeUri', function($window) {
  return $window.encodeURIComponent;
});
