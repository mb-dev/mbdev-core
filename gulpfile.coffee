gulp = require('gulp');
gutil = require('gulp-util');
coffee = require('gulp-coffee');
less = require('gulp-less')
jade = require('gulp-jade')
concat = require('gulp-concat')
gulpif = require('gulp-if')
spawn = require('child_process').spawn
path = require('path');
debug = require('gulp-debug');
plumber = require('gulp-plumber')
notify = require("gulp-notify")

paths = {}
paths.scripts = [
            'bower_components/jquery/jquery.min.js'
            'bower_components/bootstrap/dist/js/bootstrap.min.js'
            'bower_components/moment/moment.js'
            'bower_components/bignumber.js/bignumber.js'
            'bower_components/angular/angular.min.js'
            'bower_components/angular-route/angular-route.min.js'
            'bower_components/angular-sanitize/angular-sanitize.min.js'
            'bower_components/angular-resource/angular-resource.min.js'
            'bower_components/angular-cookies/angular-cookies.js'
            'bower_components/angular-moment/angular-moment.js'
            'bower_components/angular-strap/dist/angular-strap.js'
            'bower_components/angular-strap/dist/angular-strap.tpl.js'
            'bower_components/d3/d3.js'
            'bower_components/nvd3/nv.d3.js'
            'bower_components/angular-nvd3/dist/angular-nvd3.js'
            'bower_components/angular-elastic/elastic.js'
            'bower_components/filer.js/src/filer.js'
            'bower_components/sjcl/sjcl.js'
            'bower_components/checklist-model/checklist-model.js'
            'bower_components/amplify/lib/amplify.js'
            'bower_components/amplify/lib/amplify.store.js'
            'bower_components/pickadate/lib/picker.js'
            'bower_components/pickadate/lib/picker.date.js'
            'bower_components/pickadate/lib/picker.time.js'
            'bower_components/csv-js/csv.js'
            'bower_components/async/lib/async.js'
            'bower_components/db.js/src/db.js'
            'bower_components/rsvp/rsvp.js'
            'bower_components/lodash/dist/lodash.min.js'
            'bower_components/selectize/dist/js/standalone/selectize.js'
            './src/js/extensions.js'
            ]
paths.coffee_scripts = [
            './src/js/db/box.coffee'
            './src/js/db/syncable.coffee'
            './src/js/db/collection.coffee'
            './src/js/db/idb_collection.coffee'
            './src/js/db/idb_simple_collection.coffee'
            './src/js/db/simple_collection.coffee'
            './src/js/db/database.coffee'
            './src/js/db/idb.coffee'
            './src/js/user/user.coffee'
            './src/js/utils.coffee'
            ]

paths.styles = [
            'bower_components/font-awesome/css/font-awesome.css'
            'bower_components/pickadate/lib/themes/default.css'
            'bower_components/pickadate/lib/themes/default.date.css'
            'bower_components/pickadate/lib/themes/default.time.css'
            'bower_components/select2/select2.css'
            'vendor/css/select2-bootstrap.css'
            'bower_components/nvd3/nv.d3.css'
          ]

paths.views = ['./src/views/**/*.jade']

gulp.task 'build-views', ->
  gulp.src(paths.views)
    .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
    .pipe(jade())
    .pipe(gulp.dest('./dist/views'))

gulp.task 'build-js', ->
  gulp.src(paths.scripts)
    .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest('dist/js'))
  gulp.src(paths.coffee_scripts)
    .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
    .pipe(gulpif(/[.]coffee$/, coffee({bare: true})))
    .pipe(concat('core.js'))
    .pipe(gulp.dest('dist/js'))

gulp.task 'build-css', ->
  gulp.src(paths.styles)    
    .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
    .pipe(concat('vendor.css'))
    .pipe(gulp.dest('dist/css'))

gulp.task 'copy-core', ->
  gulp.src(['bower_components/font-awesome/fonts/*.*'])
    .pipe(gulp.dest('dist/fonts'));
            
gulp.task 'watch', ->
  gulp.watch(paths.scripts, ['build-js']);
  gulp.watch(paths.coffee_scripts, ['build-js']);
  gulp.watch(paths.styles, ['build-css']);
  gulp.watch(paths.views, ['build-views']);

gulp.task 'build', ['copy-core', 'build-js', 'build-css', 'build-views']
gulp.task 'start', ['build', 'watch']
