"use strict";

var gulp = require("gulp");
var sass = require("gulp-sass");
var sourcemaps = require("gulp-sourcemaps");
var gulpif = require('gulp-if');
var del = require('del');
var browserSync = require("browser-sync");
var notify = require("gulp-notify");
var plumber = require("gulp-plumber");
var postcss = require("gulp-postcss");
var autoprefixer = require("autoprefixer");
var mincss = require("gulp-csso");
var rename = require("gulp-rename");
var imagemin = require("gulp-imagemin");
var newer = require("gulp-newer");
var webp = require("gulp-webp");
var uglify = require("gulp-uglify");
var combine = require("stream-combiner2").obj;
var replace = require('gulp-replace');
var fileinclude = require('gulp-file-include');

var isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == "development";

gulp.task("style", function() {
  return gulp.src("src/scss/style.scss")
    .pipe(plumber())
    .pipe(gulpif(isDevelopment, sourcemaps.init()))
    .pipe(sass())
    .pipe(postcss([autoprefixer()]))
    .on("error", notify.onError())
    .pipe(gulpif(isDevelopment, sourcemaps.write()))
    .pipe(gulp.dest("build/css"))
    .pipe(gulpif(!isDevelopment, combine(mincss(), rename({suffix:".min"}), gulp.dest("build/css"))))
});

gulp.task("html", function() {
  return gulp.src("src/*.html")
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file'
    }))
    .pipe(gulpif(!isDevelopment, combine(replace("/style", "/style.min"), replace("/script.js", "/script.min.js"))))
    .pipe(gulp.dest("build"))
});

gulp.task("scripts", function() {
  return gulp.src('src/**/*.js')
    .pipe(gulp.dest('build'))
    .pipe(gulpif(!isDevelopment, combine(uglify(), rename({suffix:".min"}), gulp.dest('build'))))
});

gulp.task("copy:fonts", function() {
  return gulp.src("src/**/*.{woff,woff2}")
    .pipe(gulp.dest("build"))
});

gulp.task("copy:scripts", function() {
  return gulp.src("src/**/polyfills/*.js")
    .pipe(gulp.dest("build"))
});

gulp.task("copy", gulp.parallel("copy:fonts", "copy:scripts"));

gulp.task("images:default", function() {
  return gulp.src("src/images/**/*.{png,jpg,svg}")
    .pipe(newer("build/images"))
    .pipe(gulpif(!isDevelopment, imagemin([
      imagemin.optipng({optimizationLevel: 3}),
      imagemin.mozjpeg({progressive: true}),
      imagemin.svgo()
    ])))
    .pipe(gulp.dest("build/images"));
});

gulp.task("images:webp", function() {
  return gulp.src("src/images/**/*.{png,jpg}")
    .pipe(webp({quality: 90}))
    .pipe(gulp.dest("build/images"));
});

gulp.task("images", gulp.series("images:default", "images:webp"));

gulp.task("watch", function() {
  gulp.watch("src/scss/**/*.scss", gulp.series("style"));
  gulp.watch("src/**/*.*", gulp.series("style"));
  gulp.watch("src/**/*.html", gulp.series("html"));
  gulp.watch("src/images/**/*.*", gulp.series("images"));
  gulp.watch("src/fonts/**/*.{woff,woff2}", gulp.series("copy:fonts"));
  gulp.watch("src/js/**/*.js", gulp.series("scripts"));
});

gulp.task("clean", function() {
  return del("build");
});

gulp.task("server", function() {
  browserSync.init({
    server: "build",
    notify: false,
    open: true,
    cors: true,
    ui: false
  });

  browserSync.watch("build/**/*.*").on("change", browserSync.reload);
});

gulp.task("build", gulp.series("clean", gulp.parallel("style", "html", "copy", "scripts", "images")));
gulp.task("dev", gulp.series("build", gulp.parallel("watch", "server")));
