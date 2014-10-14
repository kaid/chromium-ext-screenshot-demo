"use strict";

var gulp       = require("gulp")
  , util       = require("gulp-util")
  , concat     = require("gulp-concat")
  , livescript = require("gulp-livescript")
  , cond       = require("gulp-if")
  , bower      = require("bower-files")({dir: "components"})
  , stylus     = require("gulp-stylus")
  , smaps      = require("gulp-sourcemaps")
  , uglify     = require("gulp-uglify");

var app = {
  js: ["lib/scripts/**/*.ls"].concat(bower.js),
  css: ["lib/styles/**/*.styl"],
  html: ["lib/htmls/**/*.html"],
  dist: {
    dir: "dist",
    css: "main.css"
  }
};

function is_livescript(file) {
  return !!file.path.match(/\.ls$/);
}

gulp.task("scripts", function() {
  gulp.src(app.js)
    .pipe(smaps.init())
    .pipe(cond(is_livescript, livescript()))
    .pipe(uglify({
      unsafe: true
    }))
    .pipe(smaps.write())
    .pipe(gulp.dest(app.dist.dir));
});

gulp.task("styles", function() {
  gulp.src(app.css)
    .pipe(smaps.init())
    .pipe(stylus())
    .pipe(concat(app.dist.css))
    .pipe(smaps.write())
    .pipe(gulp.dest(app.dist.dir));
});

gulp.task("htmls", function() {
  gulp.src(app.html)
    .pipe(gulp.dest(app.dist.dir));
});

gulp.task("build", ["scripts", "styles", "htmls"]);

gulp.task("watch", ["build"], function() {
  gulp.watch(app.js[0], ["scripts"]);
  gulp.watch(app.css[0], ["styles"]);
  gulp.watch(app.html[0], ["htmls"]);
});

gulp.task("default", ["build"]);
