var express = require('express');
var router = express.Router();
var lifestar = require("../lib/lifestar");
var logger = require("../lib/log").sqllog;
var _ = require("underscore");
var sha1 = require("sha1");

//lifestar.resource.data.session(req.session.user)
/* GET users listing. */
router.get('/login', function (req, res) {
    var url = req.query.u;
    if (req.query.o == "1") req.session.user = null;
    var viewData = {errinfo: ""};
    viewData["layout"] = lifestar.resource.data.session(req.session.user);
    viewData["url"] = (url == undefined) ? "" : url;
    res.render("user/login", viewData);
});


router.post('/login', function (req, res) {

    var rtnurl = req.body.url;
    var log = {
        account: req.body.account,
        passwd: sha1(req.body.pwd)
    }


    errback = function (err) {
        var viewData = {errinfo: err};
        viewData["layout"] = lifestar.resource.data.session(req.session.user);
        viewData["url"] = rtnurl;
        res.render("user/login", viewData);
    }

    lifestar.Users.doPromise(lifestar.Users.queryData, log).then(
        function (rtn) {

            if (rtn.length == 1) {
                //login succ

                var log = lifestar.UsersLog.newModelData();
                log.userID = rtn[0]._id;
                log.time = (new Date()).toLocaleString();
                log.timestamp = (new Date()).valueOf();
                log.ip = req.ip;

                lifestar.UsersLog.insertData(log,function(){},function(){});

                req.session["user"] = {photo:rtn[0].photo,userid: rtn[0]._id, fullname: rtn[0].fullname, role: rtn[0].role};

                //redirect
                res.redirect((rtnurl == "") ? "/users/center" : rtnurl);
            }
            else {
                errback("登录信息失败,用户或密码错误.")
            }
        },
        function (err) {
            errback("系统验证登录信息失败,请稍后重试.")
        }
    );
});


router.get('/register', function (req, res) {
    var viewData = {errinfo: ""};
    viewData["layout"] = lifestar.resource.data.session(req.session.user);
    res.render("user/register", viewData);
});

router.post('/register', function (req, res) {

    var user = lifestar.Users.newModelData();
    _.extend(user, {
        account: req.body.account,
        passwd: sha1(req.body.pwd),
        fullname: req.body.account.split("@")[0],
        role: 'member'
    });

    logger.info(user);

    var viewData = {errinfo: ""};
    viewData["layout"] = lifestar.resource.data.session(req.session.user);


    errback = function (err) {
        logger.error(err);
        viewData.errinfo = err;
        res.render("user/register", viewData);
    }

    lifestar.Users.doPromise(lifestar.Users.queryData, {account: user.account}).then(
        function (qryrtn) {
            if (qryrtn.length > 0) {
                errback("注册失败:用户名已经存在!");
            }
            else {
                lifestar.Users.doPromise(lifestar.Users.insertData, user).then(
                    function () {
                        //succ
                        res.redirect("/users/center");
                    },
                    function (err) {
                        errback("注册失败:" + err);
                    }
                );
            }
        },
        function (err) {
            errback("注册失败:" + err);
        }
    );


});

router.get("/center", function (req, res) {
    var uid = req.session.user.userid;
    var viewData = {layout: lifestar.resource.data.session(req.session.user)};

    lifestar.Users.doPromise(lifestar.Users.queryDataByID, uid).then(function (users) {
        viewData.user = users[0];

        lifestar.UsersLog.doPromise(lifestar.UsersLog.queryDataJson,{userID:uid},{sort:{timestamp:-1},limit:5}).then(
            function(list){
                viewData.loghistory = list;
                res.render("user/center", viewData);
            }
        );
    });
});


router.post("/center", function (req, res) {

    var uid = req.session.user.userid;
    var upt  = req.body;
    logger.info(upt);
    lifestar.Users.updateData(uid,upt,function(){

        var viewData = {layout: lifestar.resource.data.session(req.session.user)};
        viewData.info = '保存成功.'
        lifestar.Users.doPromise(lifestar.Users.queryDataByID, uid).then(function (users) {
            viewData.user = users[0];

            lifestar.UsersLog.doPromise(lifestar.UsersLog.queryDataJson,{userID:uid},{sort:{timestamp:-1},limit:5}).then(
                function(list){
                    viewData.loghistory = list;
                    res.render("user/center", viewData);
                }
            );
        });
    },function(){});

});



router.get("/profile", function (req, res) {

    var uid = req.session.user.userid;
    var info=['保存失败','保存成功',""];
    var viewData = {layout: lifestar.resource.data.session(req.session.user)};
    viewData.info = info[req.query.ok?req.query.ok:2];
    lifestar.Users.doPromise(lifestar.Users.queryDataByID, uid).then(function (users) {
            viewData.user = users[0];
            lifestar.UsersProfile.doPromise(lifestar.UsersProfile.queryData, {userID: uid}).then(
                function (userProfiles) {

                    if (userProfiles.length == 0) {

                        viewData.profile = _.extend(_.extend({}, lifestar.UsersProfile.newModelData()),{userID:uid});
                        lifestar.UsersProfile.insertData(viewData.profile,function(){},function(){});
                    }
                    else {

                        viewData.profile = userProfiles[0];
                    }
                    logger.info(viewData);
                    res.render("user/profile", viewData);
                }
            );
        }
    );

});

router.post("/profile",function(req,res){
    var dt = _.extend({'tobacco.use':'off','alcohol.use':'off','exercise.use':'off'}, req.body);
    var uid = req.session.user.userid;
    logger.info(dt);

    lifestar.UsersProfile.updateDataWhere({userID:uid},dt,function(rtn){
        if(rtn.ok){
            res.redirect("/users/profile?ok=1");
        }
    },function(){
        res.redirect("/users/profile?ok=0");
    });


});

module.exports = router;
