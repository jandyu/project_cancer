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






//app.use(favicon(path.join(__dirname, 'fav.png')));

//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded());


app.use(bodyParser.json({limit: "20mb"}));
app.use(bodyParser.urlencoded({limit: "20mb", extended: true}));



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
        var authlist = ["/forum", "/users","/admin"];
        var allowlist = ["/users/login","/users/register","/forum/index"];

        if(_.find(allowlist,function(item){return RegExp("^"+item,"i").test(url);}) == undefined){
            if(_.find(authlist,function(item){return RegExp("^"+item,"i").test(url);}) !=undefined){
                return res.redirect("/users/login?u="+url);
            }
        }
    }
    else{
        //admin
        if(/^\/admin/i.test(url) && req.session.user.username!='admin'){
            return res.redirect("/");
        }
    }

    next();
});


app.use('/', require('./routes/index'));


app.use('/users', require('./routes/users'));
app.use('/forum', require('./routes/forum'));
app.use('/admin', require('./routes/admin'));

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
