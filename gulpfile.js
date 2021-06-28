// Include Gulp
var gulp = require('gulp');
var terser = require('gulp-terser');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var filter = require('gulp-filter');
var rename = require('gulp-rename');
var minifyHtml = require('gulp-minify-html');
var minifyCss = require('gulp-minify-css');
var order = require('gulp-order');
var chmod = require('gulp-chmod');
var bower = require('gulp-bower');
var mainBowerFiles = require('main-bower-files');

// Define default destination folder
var dest = 'www/';


gulp.task('bower-install', function(){
    return bower();
});

gulp.task('js', function() {
  var jsFiles = ['src/js/*'];
  var bowerFile = mainBowerFiles();
  return gulp.src(bowerFile.concat(jsFiles))
    .pipe(filter('*.js'))
    .pipe(concat('main.js'))
    .pipe(terser())
    .pipe(rename('main.min.js'))
    .pipe(chmod(644))
    .pipe(gulp.dest(dest));
});

gulp.task('css', function() {
  var cssFiles = ['src/css/*'];
  var bowerFile = mainBowerFiles();
  return gulp.src(bowerFile.concat(cssFiles))
    .pipe(filter('*.css'))
    .pipe(order([
        'reset.css',
        'tablesort.css',
        'file.css',
        '*'
    ]))
    .pipe(concat('main.css'))
    .pipe(minifyCss())
    .pipe(chmod(644))
    .pipe(gulp.dest(dest));
});

gulp.task('html', function() {
  var htmlFiles = ['src/html/*'];
  return gulp.src(htmlFiles)
    .pipe(filter('*.html'))
    .pipe(minifyHtml())
    .pipe(chmod(644))
    .pipe(gulp.dest(dest));
});

gulp.task('lint', function() {
    return gulp.src('src/js/*.js')
    .pipe(jshint({'esversion': 8}))
    .pipe(jshint.reporter('default'));
});

gulp.task('build', gulp.series(['bower-install', 'js', 'css', 'html']));



// Watch Files For Changes
gulp.task('watch', () => {
    gulp.watch('src/js/*.js', gulp.series(['lint', 'js']));
    gulp.watch('src/css/*.css', gulp.series(['css']));
    gulp.watch('src/html/*.html', gulp.series(['html']));
});

gulp.task('default', gulp.series(['lint', 'build']));
