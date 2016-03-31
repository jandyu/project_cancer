var express = require('express');
var router = express.Router();
var lifestar = require("../lib/lifestar");
var logger = require("../lib/log").sqllog;
var _ = require("underscore");


router.get("/init/forumtopic",function(req,res){
   lifestar.ForumTopics.initTopics();
    res.send("init forum topic use forumtopic.json");
});
/* GET level 1 page. */
router.get('/:m?', function (req, res) {
    var pageName = req.params.m;
    logger.info(pageName);

    var viewName = (pageName == undefined) ? "homepage" : pageName;

    if (!_.has(lifestar.resource.data, viewName)) {
        viewName = "homepage";
    }

    var viewData = lifestar.resource.data[viewName];
    viewData["layout"] = lifestar.resource.data.session(req.session.user);
    if (pageName == "choose") viewData["cancerCategory"] = lifestar.CancerCategory.getCategory();

//    logger.info(viewData);
    res.render(viewName, viewData);

});
router.get("/legal/:m?", function (req, res) {
    var pageName = req.params.m;
    var viewData = {};
    viewData["layout"] = lifestar.resource.data.session(req.session.user);
    logger.info(viewData);
    res.render("legal/" + pageName, viewData);
});
router.get("/lv3/:m?", function (req, res) {
    var pageName = req.params.m;
    logger.info(pageName);

    var viewName = (pageName == undefined) ? "default" : pageName;

    if (!_.has(lifestar.resource.lv3, viewName)) {
        viewName = "default";
    }

    var viewData = lifestar.resource.lv3[viewName];
    viewData["layout"] = lifestar.resource.data.session(req.session.user);
    logger.info(viewData);
    res.render("lv3page", viewData);
});

router.get("/choose/canceraz", function (req, res) {
    var cancer = req.query.t;
    var stage = req.query.s;
    var q = {category: cancer, stage: stage};

    //var viewData = lifestar.cance_az.newModelData()[0];

    //lifestar.cance_az.queryData(q,function(cancer){
    //},function(err){
    //});


    var viewData = lifestar.cancer_az.newModelData()[0];
    logger.info(viewData);
    viewData["layout"] = lifestar.resource.data.session(req.session.user);
    res.render("canceraz", viewData);

});


module.exports = router;
