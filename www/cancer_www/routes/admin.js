var express = require('express');
var router = express.Router();
var lifestar = require("../lib/lifestar");
var logger = require("../lib/log").sqllog;
var _ = require("underscore");


router.get("/init/forumtopic",function(req,res){
   lifestar.ForumTopics.initTopics();
    res.send("init forum topic use forumtopic.json");
});


router.get("/index",function(req,res){
    var viewData = {};
    viewData["layout"] = lifestar.resource.data.session(req.session.user);
    res.render("admin/admin",viewData);
});




module.exports = router;
