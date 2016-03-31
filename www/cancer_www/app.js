var express = require('express');
var path = require('path');
var favicon = require('static-favicon');

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require("express-session");
var _ = require("underscore");
var app = express();





// view engine setup
var adaro = require('adaro');
app.set('views', path.join(__dirname, 'views'));
var options = {
    cache:false,
    whitespace:true,
    helpers: [
        'dustjs-helpers' //installed modules
    ]
};
app.engine('dust', adaro.dust(options));
app.set('view engine', 'dust');






app.use(favicon());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/upload',require('./routes/upload'));

app.use(session({
    secret: 'lifestar',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false}
}));
app.use(function (req, res, next) {

    var url = req.originalUrl;



    if(!req.session.user) {
        var authlist = ["/forum", "/users"];
        var allowlist = ["/users/login","/users/register","/forum/index"];

        if(_.find(allowlist,function(item){return RegExp("^"+item).test(url);}) == undefined){
            if(_.find(authlist,function(item){return RegExp("^"+item).test(url);}) !=undefined){
                return res.redirect("/users/login?u="+url);
            }
        }
    }

    next();
});


app.use('/', require('./routes/index'));


app.use('/users', require('./routes/users'));
app.use('/forum', require('./routes/forum'));

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
