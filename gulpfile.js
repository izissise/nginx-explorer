// Include Gulp
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
// Include plugins
var plugins = require("gulp-load-plugins")({
	pattern: ['gulp-*', 'gulp.*'],
	replaceString: /\bgulp[\-.]/
});
// Define default destination folder
var dest = 'www/';

gulp.task('js', function() {
	var jsFiles = ['src/js/*'];
	gulp.src(plugins.concat(jsFiles))
		.pipe(plugins.filter('*.js'))
		.pipe(plugins.concat('main.js'))
		.pipe(plugins.uglify())
		.pipe(gulp.dest(dest));
});

gulp.task('css', function() {
	var cssFiles = ['src/css/*'];
	gulp.src(plugins.mainBowerFiles().concat(cssFiles))
		.pipe(plugins.filter('*.css'))
		.pipe(plugins.order([
			'*'
		]))
		.pipe(plugins.concat('main.css'))
		.pipe(plugins.uglify())
		.pipe(gulp.dest(dest));
});

gulp.task('html', function() {
  var htmlFiles = ['src/html/*'];
  for (var src in htmlFiles) {
    gulp.src(src)
    .pipe(gulp.dest(dest));
  }
});

gulp.task('lint', function() {
    return gulp.src('src/js/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('build', ['js', 'css', 'html']);

// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch('src/js/*.js', ['lint', 'js']);
    gulp.watch('src/css/*.css', ['css']);
    gulp.watch('src/html/*.html', ['html']);
});

gulp.task('default', ['lint', 'build']);
