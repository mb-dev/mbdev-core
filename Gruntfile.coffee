module.exports = (grunt) ->
  
  # Project configuration.
  grunt.initConfig
    pkg: grunt.file.readJSON("package.json")
    coffee:
      options: {}
      files: 
        expand: true
        flatten: true
        src: "**/*.coffee"
        dest: "dist/js/"
        ext: ".js"
        cwd: "js"
    copy:
      css:
        files: [
          expand: true
          flatten: true
          src: "**/*.css"
          dest: "build/css/vendor"
          cwd: "vendor/css"
        ]
      fonts:
        files: [
          expand: true
          flatten: true
          src: "**/*.*"
          dest: "dist/fonts"
          cwd: "bower_components/font-awesome/fonts" 
        ]

    less:
      dev:
        files: [
          {src: ["app/assets/css/app.less"], dest: "public/css/app.css", nonull: true}
        ]

    concat:
      scripts:
        files: [
          {src: [
            'bower_components/jquery/jquery.min.js',
            'bower_components/select2/select2.js',
            'bower_components/bootstrap/dist/js/bootstrap.js',
            'bower_components/moment/moment.js',
            'bower_components/bignumber.js/bignumber.js',
            'bower_components/lazy.js/lazy.js',
            'bower_components/typeahead.js/dist/typeahead.js'
            'bower_components/angular/angular.min.js'
            'bower_components/angular-mocks/angular-mocks.js'
            'bower_components/angular-route/angular-route.min.js'
            'bower_components/angular-sanitize/angular-sanitize.min.js'
            'bower_components/angular-resource/angular-resource.min.js'
            'bower_components/angular-cookies/angular-cookies.js'
            'bower_components/angular-moment/angular-moment.js'
            'bower_components/angular-typeahead/angular-typeahead.js'
            'vendor/js/angular-filesystem.js'
            'bower_components/angular-ui-select2/src/select2.js'
            'bower_components/checklist-model/checklist-model.js'
            'bower_components/ngStorage/src/angularLocalStorage.js'
            'bower_components/pickadate/lib/picker.js'
            'bower_components/pickadate/lib/picker.date.js'
            'bower_components/pickadate/lib/picker.time.js'
            'bower_components/csv/lib/csv.js'
            'bower_components/selectize/dist/js/standalone/selectize.js'
          ], dest: "dist/js/vendor.js", nonull: true}
        ]
      css:
        files: 
          "dist/css/vendor.css": [
            'bower_components/font-awesome/css/font-awesome.css'
            'bower_components/pickadate/lib/themes/default.css'
            'bower_components/pickadate/lib/themes/default.date.css'
            'bower_components/pickadate/lib/themes/default.time.css'
            'bower_components/select2/select2.css'
            'vendor/css/select2-bootstrap.css'
          ]
    jade:
      compile:
        options:
          data:
            debug: false

        files: [
          expand: true
          src: "**/*.jade"
          dest: "dist/views"
          ext: ".html"
          cwd: "views/"
        ]

  
  # grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks "grunt-contrib-jade"
  grunt.loadNpmTasks "grunt-contrib-copy"
  grunt.loadNpmTasks "grunt-contrib-coffee"
  grunt.loadNpmTasks "grunt-contrib-uglify"
  grunt.loadNpmTasks "grunt-contrib-concat"
  grunt.loadNpmTasks "grunt-contrib-less"
  
  # Default task(s).
  grunt.registerTask "scripts", "", ["coffee", "concat:scripts"]
  grunt.registerTask "css", "", ["concat:css"]
  grunt.registerTask "templates", "", ["jade"]
  grunt.registerTask "fonts", "", ["copy:fonts"]
  grunt.registerTask "build", "", ["scripts", "css", "fonts", "templates"]
