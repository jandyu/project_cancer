var express = require('express');
var router = express.Router();
var lifestar = require("../lib/lifestar");
var autil = require("../lib/autil");
var logger = require("../lib/log").sqllog;
var _ = require("underscore");
var sha1 = require("sha1");

var Promise = require("promise");


/* GET users listing. */
router.get('/index', function (req, res) {
    var url = req.query.u;

    lifestar.ForumTopics.getTopics().then(function (rtn) {

            var viewData = {forum: rtn};
            viewData["layout"] = lifestar.resource.data.session(req.session.user);
            res.render("forum/index", viewData);
        },
        function (err) {
            logger.info(err);
            res.render("error", err);
        }
    );

});

router.get("/category/:id", function (req, res) {

    var tid = req.params.id;

    Promise.all([
            lifestar.ForumTopics.doPromise(lifestar.ForumTopics.queryDataByID, tid),
            lifestar.ForumArticles.doPromise(lifestar.ForumArticles.queryData, {topicID: tid}),
            lifestar.ForumTopics.getTopics()
        ])
        .then(function (lst) {

            var viewData = {topic: lst[0][0], articles: lst[1], forum: lst[2]};

            viewData["layout"] = lifestar.resource.data.session(req.session.user);
            logger.info(viewData);
            res.render("forum/category", viewData);
        }, function (err) {
            res.render("error", err);
        });

});


router.post("/newarticle", function (req, res) {
    var d = {
        "topicID": req.body.topicID,
        "topic": req.body.topic,
        "title": req.body.title,
        "content": req.body.content,
        "replycnt": 1,
        "lastreply": autil.DateFormat (new Date(), 'yyyy-MM-dd hh:mm:ss'),
        "user": {
            "photo": req.body.photo,
            "fullname": req.body.fullname,
            "userID": req.body.userID
        }
    }

    logger.info(d);
    var c = req.body.topicID;
    lifestar.ForumArticles.insertData(d, function () {
        res.redirect("/forum/category/" + c);
    }, function () {
        res.redirect("/forum/category/" + c);
    });
});


router.get("/article/:id", function (req, res) {

    var tid = req.params.id;

    Promise.all([
            lifestar.ForumArticles.doPromise(lifestar.ForumArticles.queryDataByID, tid),
            lifestar.ForumReplies.doPromise(lifestar.ForumReplies.queryDataWithOptions, {articleID: tid}, {sort: {timestamp: -1}}, "json"),

        ])
        .then(function (lst) {
            var topicid = lst[0][0].topicID;
            var viewData = {article: lst[0][0], replies: lst[1]};
            lifestar.ForumArticles.doPromise(lifestar.ForumArticles.queryData, {topicID: topicid}).then(function (rlst) {

                viewData["layout"] = lifestar.resource.data.session(req.session.user);
                viewData["rlist"] = rlst;
                logger.info(viewData);
                res.render("forum/article", viewData);
            });
        }, function (err) {
            res.render("error", err);
        });

});


router.post("/newreply", function (req, res) {
    var d =
    {
        "articleID": req.body.articleID,
        "content": req.body.content,
        "timestamp": autil.DateFormat (new Date(), 'yyyy-MM-dd hh:mm:ss'),
        "user": {
            "photo": req.body.photo,
            "fullname": req.body.fullname,
            "userID": req.body.userID
        }
    }


    logger.info(d);
    var c = req.body.articleID;
    lifestar.ForumArticles.updateDataWhereWithData({_id: c}, {$inc: {replycnt: 1}, $set: {lastreply: d.timestamp}},
        function () {
        }, function () {
        });

    lifestar.ForumReplies.insertData(d, function () {
        res.redirect("/forum/article/" + c);
    }, function () {
        res.redirect("/forum/article/" + c);
    });
});


router.get("/search", function (req, res) {
    var keyword = req.query.keyword;
    var q = {$or:[{title:{$regex:RegExp(keyword)}},{content:{$regex:RegExp(keyword)}}]};

    Promise.all([

            lifestar.ForumArticles.doPromise(lifestar.ForumArticles.queryData, q),
            lifestar.ForumTopics.getTopics()
        ])
        .then(function (lst) {
            console.info(lst);
            var viewData = {keyword:keyword,articles: lst[0],forum: lst[1]};

            viewData["layout"] = lifestar.resource.data.session(req.session.user);
            logger.info(viewData);
            res.render("forum/search", viewData);
        }, function (err) {
            res.render("error", err);
        });


});

module.exports = router;
