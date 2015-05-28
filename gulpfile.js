// Include Gulp
var gulp = require('gulp');
// Include plugins
var plugins = require("gulp-load-plugins")({
	pattern: ['gulp-*', 'gulp.*', 'main-bower-files'],
	replaceString: /\bgulp[\-.]/
});
// Define default destination folder
var dest = 'www/';

gulp.task('js', function() {
	var jsFiles = ['src/js/*'];
	gulp.src(plugins.mainBowerFiles().concat(jsFiles))
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
