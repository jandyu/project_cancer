var express = require('express');
var router = express.Router();
var lifestar = require("../lib/lifestar");
var logger = require("../lib/log").sqllog;
var _ = require("underscore");


router.get("/richtext", function (req, res) {
    var cancer = req.query.cancerType;
    var stage = req.query.cancerStage;
    var q = {cancerStage: stage, cancerType: cancer};

    //var viewData = lifestar.cance_az.newModelData()[0];
    var viewData = _.clone(q);

    lifestar.CancerCategory.queryData({_id: cancer}, function (can) {
        viewData["cancerTitle"] = can[0].title +"-"+ lifestar.CancerResource.getResourceName(stage).title;

        viewData["layout"] = lifestar.resource.data.session(req.session.user);
        lifestar.cancer_az.queryData(q, function (cancer) {
            viewData["cancer"] = cancer[0];
            logger.info(viewData);
            res.render("admin/richtext", viewData);
        }, function (err) {
            res.render("admin/richtext", viewData);
        });
    },function(err){
        res.render("admin/richtext",viewData);
    })
});
router.get("/init/forumtopic", function (req, res) {
    lifestar.ForumTopics.initTopics();
    res.send("init forum topic use forumtopic.json");
});
router.get("/admin/:model", function (req, res) {
    var viewData = {};
    viewData["layout"] = lifestar.resource.data.session(req.session.user);
    res.render("admin/" + req.params.model, viewData);
});


router.get("/info", function (req, res) {
    var viewData = {};
    viewData["layout"] = lifestar.resource.data.session(req.session.user);

    lifestar.CancerCategory.queryData({}, function (rtn) {
        viewData["category"] = rtn;
        //viewData['stage'] = lifestar.CancerStage.getStage();
        viewData['stage'] = lifestar.CancerResource.getResList();
        //console.info(viewData);
        res.render("admin/info", viewData);
    }, function (err) {
        res.send(err);
    });
});

router.post("/info", function (req, res) {
    var data = req.body;
    console.info(data);
    var where = {cancerType: data.cancerType, cancerStage: data.cancerStage};
    lifestar.cancer_az.updateDataWhere(where, data, function () {
        res.redirect("/admin/info");
    }, function () {
        res.redirect("/admin/info");
    });
});
router.get("/cancertype", function (req, res) {
    var viewData = {};
    viewData["layout"] = lifestar.resource.data.session(req.session.user);


    lifestar.CancerCategory.queryData({}, function (rtn) {
        viewData["category"] = rtn;
        console.info(viewData);
        res.render("admin/cancertype", viewData);
    }, function (err) {
        res.send(err);
    });
});
router.post("/cancertype", function (req, res) {
    var data = req.body;

    console.info(data);
    if (data._id == "0") {
        lifestar.CancerCategory.insertData(data, function () {
            res.redirect("/admin/cancertype");
        }, function () {
            res.redirect("/admin/cancertype");
        });
    } else {

        if (data.title == "") {
            lifestar.CancerCategory.deleteData({_id: data._id}, function (rtn) {
                res.redirect("/admin/cancertype");
            }, function (err) {
                res.redirect("/admin/cancertype");
            });
        }
        else {
            lifestar.CancerCategory.updateData(data._id, {title: data.title}, function (rtn) {
                res.redirect("/admin/cancertype");
            }, function (err) {
                res.redirect("/admin/cancertype");
            });
        }
    }
});
router.get("/topic", function (req, res) {
    var viewData = {};
    viewData["layout"] = lifestar.resource.data.session(req.session.user);

    lifestar.ForumTopics.queryData({}, function (rtn) {
        viewData["topic"] = _.sortBy(rtn, 'category')
        //viewData["topic"]=rtn;
        console.info(viewData);
        res.render("admin/topic", viewData);
    }, function (err) {
        res.send(err);
    });
});
router.post("/topic", function (req, res) {
    var data = req.body;
    data.desc = data.desc.replace("'", " ");
    console.info(data);
    if (data._id == "0") {
        lifestar.ForumTopics.insertData(data, function () {
            res.redirect("/admin/topic");
        }, function () {
            res.redirect("/admin/topic");
        });
    } else {

        if (data.title == "") {
            lifestar.ForumTopics.deleteData({_id: data._id}, function (rtn) {
                res.redirect("/admin/topic");
            }, function (err) {
                res.redirect("/admin/topic");
            });
        }
        else {


            lifestar.ForumTopics.updateData(data._id, {desc: data.desc, category: data.category, title: data.title}, function (rtn) {
                res.redirect("/admin/topic");
            }, function (err) {
                res.redirect("/admin/topic");
            });
        }
    }
});


router.get("/index", function (req, res) {
    var viewData = {};
    viewData["layout"] = lifestar.resource.data.session(req.session.user);
    res.render("admin/admin", viewData);
});


module.exports = router;
