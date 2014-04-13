angular.module('app.services')  
  .factory 'errorReporter', () ->
    errorCallbackToScope: ($scope) ->
      (reason) ->
        $scope.error = "failure for reason: " + reason

  .factory 'storageService', ($q) ->
    appDetails = {}
    {
      isAuthenticateTimeAndSet: ->
        shouldAuthenticate = false
        if !amplify.store('lastAuthenticateTime') || moment().diff(moment(amplify.store('lastAuthenticateTime')), 'hours') > 1
          shouldAuthenticate = true

        if shouldAuthenticate
          amplify.store('lastAuthenticateTime', moment().toISOString())

        shouldAuthenticate
      getUserDetails: ->
        amplify.store('user')
      setAppName: (appName, appDomain) ->
        appDetails = {appName: appName, appDomain: appDomain}
        amplify.store('appDetails', appDetails)
      isUserExists: ->
        !!amplify.store('user')
      setUserDetails: (userDetails) ->
        amplify.store('user', userDetails)
      setLastModifiedDate: (appName, tableName, updatedAt) ->
        amplify.store('user').lastModifiedDate["#{appName}-#{tableName}"] = updatedAt
      getEncryptionKey: ->
        userId = amplify.store('user').id
        return null if !userId
        amplify.store("#{userId}-encryptionKey")
      setEncryptionKey: (encryptionKey) ->
        userId = amplify.store('user').id
        return if !userId
        amplify.store("#{userId}-encryptionKey", encryptionKey)
      onLogout: ->
        userId = amplify.store('user').id
        return if !userId
        amplify.store("#{userId}-encryptionKey", null)
        amplify.store('user', null)
      getToken: ->
        amplify.store("auth-token")
      setToken: (token) ->
        amplify.store("auth-token", token)
      getSuccessMsg: ->
        amplify.store.sessionStorage('successMsg')
      setSuccessMsg: (msg) ->
        amplify.store.sessionStorage('successMsg', msg)
      getNoticeMsg: ->
        amplify.store.sessionStorage('noticeMsg')
      setNoticeMsg: (msg) ->
        amplify.store.sessionStorage('noticeMsg', msg)
      clearMsgs: ->
        amplify.store.sessionStorage('successMsg', null)
        amplify.store.sessionStorage('noticeMsg', null)

      readFile: (fileName) ->
        defer = $q.defer()
        @setupFilesystem().then (config) ->
          config.filer.open '/db/ ' + fileName, (file) ->
            reader = new FileReader();
            reader.onload = (e) ->
              defer.resolve(reader.result)
            read.readAsArrayBuffer(file)
          , (err) ->
            defer.reject(err)
        defer.promise
      writeFile: (fileName, content) ->
        defer = $q.defer()
        @setupFilesystem().then (config) ->
          config.filer.write '/db/' + fileName, {data: content, type: 'text/plain'}, (fileEntry, fileWriter) ->
            defer.resolve(config)
          , (err) ->
            defer.reject(err)
        , (err) ->
          defer.reject(err)
        defer.promise
      setupFilesystem: ->
        defer = $q.defer()
        filer = new Filer();
        filer.init {size: 1024 * 1024 * 50}, (fs) ->
          filer.mkdir '/db', false, (dirEntry) ->
            defer.resolve({fs: fs, filer: filer})
          , (err) ->
            defer.reject(err)  
        , (err) -> 
          defer.reject(err)
        defer.promise
    }


angular.module('app.directives')
  .directive 'currencyWithSign', ($filter) ->
    {
      restrict: 'E',
      link: (scope, elm, attrs) ->
        currencyFilter = $filter('currency')
        scope.$watch attrs.amount, (value) ->
          if typeof value != 'string'
            value = value.toString()
          if (typeof value == 'undefined' || value == null)
            elm.html('')
          else if value[0] == '-'
            elm.html('<span class="negative">' + currencyFilter(value) + '</span>')
          else
            elm.html('<span class="positive">' + currencyFilter(value) + '</span>')
    }
  
  .directive 'dateFormat', ($filter) ->
    dateFilter = $filter('localDate')
    {  
      require: 'ngModel'
      link: (scope, element, attr, ngModelCtrl) ->
        ngModelCtrl.$formatters.unshift (value) ->
          if value then dateFilter(value) else ''
        
        ngModelCtrl.$parsers.push (value) ->
          if value then moment(value).valueOf() else null
    }

  .directive 'floatToString', ($filter) ->
    {  
      require: 'ngModel'
      link: (scope, element, attr, ngModelCtrl) ->
        ngModelCtrl.$formatters.unshift (value) ->
          return 0 if !value
          parseFloat(value)
        
        ngModelCtrl.$parsers.push (value) ->
          value.toString()
    }

  .directive 'typeFormat', ($filter) ->
    typeFilter = $filter('typeString')
    {  
      require: 'ngModel'
      link: (scope, element, attr, ngModelCtrl) ->
        ngModelCtrl.$formatters.unshift (value) ->
          typeFilter(value)
        
        ngModelCtrl.$parsers.push (value) ->
          if value == 'Expense' then LineItemCollection.EXPENSE else LineItemCollection.INCOME
    }

  .directive 'numbersOnly', () ->
    {
      require: 'ngModel',
      link: (scope, element, attrs, modelCtrl) ->
        modelCtrl.$parsers.push (inputValue) -> 
          parseInt(inputValue, 10)
    }

  .directive 'pickadate', () ->
    {
      require: 'ngModel',
      link: (scope, element, attrs, ngModel) ->
        initialized = false
        scope.$watch(() ->
          ngModel.$modelValue;
        , (newValue) ->
          if newValue && !initialized
            element.pickadate({
              format: 'mm/dd/yyyy'
            })
            # picker = element.pickadate('picker')
            # $inputText = element.on(
            #   change: ->
            #     parsedDate = Date.parse(@value)
            #     if parsedDate
            #       picker.set "select", [parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()]
            #     else
            #       alert("Invalid date")
            #   focus: ->
            #     picker.open(false)
            #   blur: ->
            #     picker.close()
            # )
            # picker.on "set", ->
            #   element.val(@get("value"))
            initialized = true
        )
    }
  .directive "fileread", () ->
    scope: 
      fileread: "="
    link: (scope, element, attributes) ->
      element.bind "change", (changeEvent) ->
        scope.$apply () ->
          scope.fileread = changeEvent.target.files[0]
        
  .directive 'ngConfirmClick', ->
    link: (scope, element, attr) ->
        msg = attr.ngConfirmClick || "Are you sure?";
        clickAction = attr.confirmedClick
        element.bind 'click', (event) ->
          if window.confirm(msg)
            scope.$eval(clickAction)

  .directive 'autoresize', ($window) ->
    restrict: 'A',
    link: (scope, element, attrs) ->
      offset = if !$window.opera then (element[0].offsetHeight - element[0].clientHeight) else (element[0].offsetHeight + parseInt($window.getComputedStyle(element[0], null).getPropertyValue('border-top-width'))) ;

      resize  = (el)  ->
        el.style.height = 'auto';
        el.style.height = (el.scrollHeight  + offset ) + 'px'
   
      element.bind('input', -> resize(element[0]))
      element.bind('keyup', -> resize(element[0]))

  .directive 'selectize', ($timeout) ->       
    restrict: 'A',
    require: '?ngModel',
    link: (scope, element, attrs, ngModel) ->

      $timeout ->
        if attrs.selectize == 'stringsWithCreate'
          allItems = scope.$eval(attrs.allItems)
          if allItems
            alteredAllItems = allItems.map (item) -> {value: item, text: item} 
            if !attrs.multiple
              selectedItem = ngModel.$modelValue
              alteredAllItems.push({value: selectedItem, text: selectedItem}) if selectedItem && allItems.indexOf(selectedItem) < 0
          $(element).selectize({
            plugins: ['restore_on_backspace']
            persist: false
            createOnBlur: true
            sortField: 'text'
            options: alteredAllItems
            create: (input) ->
              value: input
              text: input
          })
        else if attrs.selectize == 'objectsWithIdName'
          ngModel.$parsers.push (value) ->
            value.map (item) -> parseInt(item, 10)
          allItems = scope.$eval(attrs.allItems)
          $(element).selectize({
            create: false,
            valueField: 'id'
            labelField: 'name'
            searchField: 'name'
          })

 angular.module('app.filters')
  .filter 'localDate', ($filter) ->
    angularDateFilter = $filter('date')
    (theDate) ->
      angularDateFilter(theDate, 'MM/dd/yyyy')

  .filter 'monthDay', ($filter) ->
    angularDateFilter = $filter('date')
    (theDate) ->
      angularDateFilter(theDate, 'MM/dd')

  .filter 'percent', ->
    (value) ->
      value + '%'

  .filter 'mbCurrency', ($filter) ->
    angularCurrencyFilter = $filter('currency')
    (number) ->
      result = angularCurrencyFilter(number)
      if result[0] == '('
        '-' + result[1..-2]
      else
        result

  .filter 'typeString', ($filter) ->
    (typeInt) ->
      if typeInt == LineItemCollection.EXPENSE then 'Expense' else 'Income'

   .filter 'bnToFixed', ($window) ->
     (value, format) -> 
      if (typeof value == 'undefined' || value == null)
        return ''

      value.toFixed(2)

  .filter 'joinBy', () ->
    (input, delimiter) ->
      (input || []).join(delimiter || ', ')

  .filter 'newline', ($sce) ->
    (string) ->
      return '' if !string
      $sce.trustAsHtml(string.replace(/\n/g, '<br/>'));
        