/**
 * Created by jrain on 16/3/24.
 */

var express = require('express');
var router = express.Router();
var lifestar = require("../lib/lifestar");
var logger = require("../lib/log").sqllog;
var _ = require("underscore");

module.exports = {
    express: express,
    router: router,
    lifestar: lifestar,
    logger: logger,
    _: _
}


function dalPromise(func) {
    var deferred = $q.defer();
    var funcArgument=[];
    for(var i=1;i<arguments.length;i++){
        funcArgument[i - 1] = arguments[i];
    }
    funcArgument.push(function(succ){
        deferred.resolve(succ);
    });
    funcArgument.push(function(err){
        deferred.reject(err);
    });

    func.apply(this,funcArgument);

    return deferred.promise;
}

dalPromise(lifestar.Users.queryData,{}).then(
    function(){

    },
    function(){

    }
);