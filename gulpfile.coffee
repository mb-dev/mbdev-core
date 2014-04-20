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

paths = {}
paths.scripts = [
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
            'bower_components/filer.js/src/filer.js'
            'bower_components/angular-ui-select2/src/select2.js'
            'bower_components/checklist-model/checklist-model.js'
            'bower_components/amplify/lib/amplify.js'
            'bower_components/pickadate/lib/picker.js'
            'bower_components/pickadate/lib/picker.date.js'
            'bower_components/pickadate/lib/picker.time.js'
            'bower_components/csv/lib/csv.js'
            'bower_components/selectize/dist/js/standalone/selectize.js'
            ]
paths.coffee_scripts = './src/js/**/*.coffee'

paths.styles = [
            'bower_components/font-awesome/css/font-awesome.css'
            'bower_components/pickadate/lib/themes/default.css'
            'bower_components/pickadate/lib/themes/default.date.css'
            'bower_components/pickadate/lib/themes/default.time.css'
            'bower_components/select2/select2.css'
            'vendor/css/select2-bootstrap.css'
          ]

paths.views = ['./src/views/**/*.jade']

gulp.task 'build-views', ->
  gulp.src(paths.views)
    .pipe(jade())
    .pipe(gulp.dest('./dist/views'))

gulp.task 'build-js', ->
  gulp.src(paths.scripts)
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest('dist/js'))
  gulp.src(paths.coffee_scripts)
    .pipe(gulpif(/[.]coffee$/, coffee({bare: true}).on('error', gutil.log)))
    .pipe(gulp.dest('dist/js'))

gulp.task 'build-css', ->
  gulp.src(paths.styles)    
    .pipe(concat('vendor.css'))
    .pipe(gulp.dest('dist/css'))

gulp.task 'copy-core', ->
  gulp.src(['bower_components/font-awesome/fonts/*.*'])
    .pipe(gulp.dest('dist/fonts'));
            
gulp.task 'watch', ->
  gulp.watch(paths.scripts, ['build-js']);
  gulp.watch(paths.styles, ['build-css']);
  gulp.watch(paths.views, ['build-views']);

gulp.task 'build', ['copy-core', 'build-js', 'build-css', 'build-views']
gulp.task 'start', ['build', 'watch']