var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

//var indexRouter = require('./server/routes/index');
//var apiRouter = require('./server/routes/api');
var apiRouter = require('./server/api/api-server.js');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


/* ----- API ------ */
app.use('/api', function(req, res, next){
    console.log("/api");
    next();
});
app.use('/api',apiRouter);



/* LOCAL PAGE */
//app.use('/', indexRouter);
app.get('/?', function(req, res, next) {
    console.log("/?")
    res.sendFile("./index.html");
});


module.exports = app;
