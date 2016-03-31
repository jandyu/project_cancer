/**
 * Created by jrain on 16/1/28.
 */

var mongodb = require("mongodb");
ObjectID = require('mongodb').ObjectID;
var connection = require('./connection');

var fs = require('fs');
var uuid = require('uuid');
var Promise = require('promise');


var BSON = mongodb.BSONPure;

var _ = require('underscore');

var logger = require("./log").sqllog;

var dbConfig = JSON.parse(fs.readFileSync("mongodb.json", "utf8"));


var Promise = require("promise");


var dal = {
    collectionName: "",
    modelName: "",

    errorCallBack: function (err) {
        //TODO:global error callback in class
        //if define errback ,do errback , else do class.errorCallback
    },
    newModelData: function () {
        var me = this;
        if (me.modelName != "") {
            return JSON.parse(fs.readFileSync('./lib/model/' + me.modelName + ".json", "utf8"));
        }
        return undefined;
    },
    doPromise: function (func) {
        var me = this;
        var funcArgument = [];
        for (var i = 1; i < arguments.length; i++) {
            funcArgument[i - 1] = arguments[i];
        }
        return new Promise(function (resolve, reject) {
            funcArgument.push(function (succ) {
                resolve(succ);
            });
            funcArgument.push(function (err) {
                reject(err);
            });
            func.apply(me, funcArgument);
        });
    },
    max: function (query, field, callback, errback) {
        var me = this;
        var options = {limit: 1, fields: {}, sort: {}};
        options.fields[field] = 1;
        options.sort[field] = -1;
        this.queryDataJson(query, options, function (rtns) {

            logger.info("max :" + me.collectionName + "  query max:" + JSON.stringify(query) + ",return:" + JSON.stringify(rtns));
            if (rtns.length > 0) {
                callback(rtns[0][field]);
            }
            else {
                callback("");
            }
        }, errback);
    },

    count: function (query, callback, errback) {
        var me = this;
        connection.connect(dbConfig.db + '/' + dbConfig.database, function (err, db) {

            if (err) {
                logger.error('Db open error: ' + err.message);
                errback(err.message);
                return;
            }

            db.collection(me.collectionName, function (err, collection) {
                if (err) {
                    logger.error('Error getting collection ' + me.collectionName + ': ' + err.message);
                    errback(err.message);
                    return;
                }
                collection.count(query, function (err, count) {
                    logger.info("count :" + me.collectionName + "  count:" + JSON.stringify(query) + ",return:" + count);
                    callback({ok: 1, count: count});
                });
            });
        });

    },


    /**
     * distinct
     * @param keyname
     * @param callback
     * @param errback
     */
    distinct: function (keyname, callback, errback) {
        var me = this;
        connection.connect(dbConfig.db + '/' + dbConfig.database, function (err, db) {

            if (err) {
                logger.error('Db open error: ' + err.message);
                errback(err.message);
                return;
            }

            db.collection(me.collectionName, function (err, collection) {
                if (err) {
                    logger.error('Error getting collection ' + me.collectionName + ': ' + err.message);
                    errback(err.message);
                    return;
                }

                collection.distinct(keyname, function (err, docs) {
                    if (err) {
                        logger.error('Error distinct from ' + me.collectionName + ': ' + err.message);
                        errback(err.message);
                        return;
                    }
                    logger.info("distinct :" + me.collectionName + " " + me.modelName + " " + keyname);
                    callback({ok: 1, data: docs});
                });
            });
        });
    },
    /*
     delete
     */
    deleteData: function (query, callback, errback) {
        var me = this;
        connection.connect(dbConfig.db + '/' + dbConfig.database, function (err, db) {

            if (err) {
                logger.error('Db open error: ' + err.message);
                errback(err.message);
                return;
            }

            db.collection(me.collectionName, function (err, collection) {
                if (err) {
                    logger.error('Error getting collection ' + me.collectionName + ': ' + err.message);
                    errback(err.message);
                    return;
                }

                collection.remove(query, function (err, docs) {
                    if (err) {
                        logger.error('Error removing from ' + me.collectionName + ': ' + err.message);
                        errback(err.message);
                        return;
                    }
                    logger.info("delete :" + me.collectionName + " " + me.modelName + JSON.stringify(query));
                    callback({ok: 1});
                });
            });
        });
    },
    deleteDataByID: function (id, callback, errback) {
        //var spec = {'_id': new BSON.ObjectID(id)};
        var spec = {'_id': id};
        this.deleteData(spec, callback, errback);
    },
    updateData: function (id, data, callback, errback) {
        var spec = {'_id': id};
        this.updateDataWhere(spec, data, callback, errback);
    },

    updateDataWhere: function (query, data, callback, errback) {
        //var spec = {'_id': new BSON.ObjectID(id)};
        var mdata = {$set: data};
        this.updateDataWhereWithData(query,mdata,callback,errback);
    },
    updateDataWhereWithData: function (query, data, callback, errback) {
        //var spec = {'_id': new BSON.ObjectID(id)};

        var me = this;
        connection.connect(dbConfig.db + '/' + dbConfig.database, function (err, db) {

            if (err) {
                logger.error('Db open error: ' + err.message);
                errback(err.message);
                return;
            }

            db.collection(me.collectionName, function (err, collection) {
                if (err) {
                    logger.error('Error getting collection ' + me.collectionName + ': ' + err.message);
                    errback(err.message);
                    return;
                }


                var opt = {multi: true, upsert: true};
                collection.update(query, data, opt, function (err, docs) {
                    logger.info("udpate " + me.collectionName + " " + me.modelName + " where:" + JSON.stringify(query) + 'rtn:' + JSON.stringify(docs));
                    callback({ok: 1, data: docs});
                });
            });
        });
    },
    transformCollection: function (outputType, data) {
        return data;
    },
    /*
     split page query
     */
    queryPageData: function (query, page, pagesize, callback, errback) {
        var p = page > 0 ? 1 : page;
        var ps = pagesize > 0 ? 1 : pagesize;
        var options = {limit: pagesize, skip: ps * (p - 1)};

        this.queryDataJson(query, options, callback, errback);
    },
    queryData: function (query, callback, errback) {
        var options = {limit: 999};  //defualt max return 999
        this.queryDataJson(query, options, callback, errback);
    },
    queryDataByID: function (id, callback, errback) {
        //var spec = {'_id': new BSON.ObjectID(id)};
        var spec = {'_id': id};
        var options = {limit: 1, fields: {password: 0}};
        this.queryDataJson(spec, options, callback, errback);
    },
    queryDataJson: function (query, options, callback, errback) {
        this.queryDataWithOptions(query, options, 'json', callback, errback);
    },

    queryDataWithOptions: function (query, options, outputType, callback, errback) {
        //TODO: need helper func for options{sort , limit, skip ,fields}
        var me = this;

        connection.connect(dbConfig.db + '/' + dbConfig.database, function (err, db) {

            if (err) {
                logger.error('Db open error: ' + err.message);
                errback(err.message);
                return;
            }

            db.collection(me.collectionName, function (err, collection) {
                if (err) {
                    logger.error('Error getting collection ' + me.collectionName + ': ' + err.message);
                    errback(err.message);
                    return;
                }

                collection.find(query, options, function (err, cursor) {
                    if (err) {
                        logger.error('Error finding document(s): ' + err.message);
                        errback(err.message);
                        return;
                    }

                    cursor.toArray(function (err, docs) {
                        if (err) {
                            logger.error('Error getting database cursor as array: ' + err.message);
                            errback(err.message);
                            return;
                        }
                        var result = [];
                        docs.forEach(function (doc) {
                            result.push(doc);
                        });
                        logger.info("query :" + me.collectionName + ":" + JSON.stringify(query) + ",options:" + JSON.stringify(options) + " ,count:" + result.length);
                        //logger.info(result);
                        callback(me.transformCollection(outputType, result));
                    });
                });
            });

        });
    },
    insertNewData: function (callback, errback) {
        var me = this;
        var newdata = me.newModelData();
        me.insertData(newdata, callback, errback);
    },
    /*
     insert
     */
    insertData: function (data, callback, errback) {

        if (_.has(data, "_id")) {
            data._id = uuid.v4().replace(/-/g, "");
        } else {
            data["_id"] = uuid.v4().replace(/-/g, "");
        }
        var me = this;
        connection.connect(dbConfig.db + '/' + dbConfig.database, function (err, db) {
            if (err) {
                logger.error('Db open error: ' + err.message);
                errback(err.message);
                return;
            }

            db.collection(me.collectionName, function (err, collection) {
                if (err) {
                    logger.error('Error getting collection ' + me.collectionName + ': ' + err.message);
                    errback(err.message);
                    return;
                }


                collection.insert(
                    data,
                    function (err, docs) {
                        if (err) {
                            logger.error('Error inserting into collection ' + me.collectionName + ': ' + err.message);
                            errback(err.message);
                            return;
                        }
                        logger.info("insert:" + me.collectionName + " " + me.modelName + ":" + docs);
                        //db.close();
                        callback({ok: 1, data: docs});
                    }
                );
            });
        });
    }
}

/*
 pilatus models
 */

var lifestar = {

    resource: _.extend(_.extend({}, dal), {
        "collectionName": "Resource", "modelName": "resource",
        data: {
            layout: {
                logo: {img: "/images/logo.png", link: '/'},
                menu: [
                    {title: "首页", link: "/"},
                    {title: "为何选择心生命", link: "/whylf"},
                    {title: "病情和可选方案", link: "/choose"},
                    {title: "向别人学习", link: "/connect"},
                    {title: "支持服务", link: "/support"},
                    {title: "星生命故事", link: "/story"},
                    {title: "登录", link: "/users/login"},
                    {title: "用户信息", link: "/users/center"}
                ],
                footer: [
                    {
                        title: "关于星生命",
                        link: [
                            {title: '我们是谁', link: ''},
                            {title: '新闻', link: ''},
                            {title: '广告', link: ''},
                            {title: '职业', link: ''},
                            {title: '赞助商', link: ''},
                            {title: '加盟计划', link: ''},
                        ]
                    },
                    {
                        title: "帮助",
                        link: [
                            {title: '网站导航', link: ''},
                            {title: '系统要求', link: ''}
                        ]
                    },
                    {
                        title: "联系方式",
                        link: [
                            {title: '找到一个星生命的会议', link: ''},
                            {title: '社区', link: ''},
                            {title: '联系我们', link: ''},
                            {title: '微信二维码', link: ''}
                        ]
                    }
                ],
                policy: {
                    link: [
                        {title: "法律声明", link: "/legal/notice"},
                        {title: "隐私声明", link: "/legal/privacy"},
                        {title: "免责声明", link: "/legal/disclaimer"},
                        {title: "留言板使用规则", link: "/legal/boardtc"}
                    ],
                    desc: "© 2016 星生命 International, Inc. All rights reserved."
                }
            },
            homepage: {
                slide: [
                    {img: "/images/home/slide1.jpg", link: ""},
                    {img: "/images/home/slide2.jpg", link: ""},
                    {img: "/images/home/slide3.jpg", link: ""},
                    {img: "/images/home/slide4.jpg", link: ""},
                    {img: "/images/home/slide5.jpg", link: ""},
                    {img: "/images/home/slide6.jpg", link: ""}
                ],
                succ: [
                    {
                        head: "/images/home/head1.jpg",
                        desc: "琳达是一位癌症幸存者…. 也许你忧伤的坐着, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
                    },
                    {
                        head: "/images/home/head2.jpg",
                        desc: "珍妮是一个癌症幸存者 …. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
                    },
                    {
                        head: "/images/home/head3.jpg",
                        desc: "安妮是一个癌症幸存者 …. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
                    },
                ]
            },
            whylf: {},
            choose: {},

            connect: {
                link: [
                    {icon: 'lf-icon-forum', title: '社区留言板', subtitle: '聊天和常见问题', href: '/forum/index'},
                    {icon: 'lf-icon-coach', title: '星生命专家', subtitle: '星生命专家让你保持健康', href: '/lv3/coach'},
                    {icon: 'lf-icon-second', title: '健康咨询', subtitle: '远程咨询会诊', href: '/lv3/second'}
                ]
            },
            support: {
                link: [
                    {icon: 'lf-icon-usa', title: '健康咨询', href: '/lv3/second'},
                    {icon: 'lf-icon-travl', title: '医疗旅游(美国)', href: '/lv3/travl'},
                    {icon: 'lf-icon-test', title: '临床试验服务', href: '/lv3/test'},
                    {icon: 'lf-icon-look', title: '家庭护理和康复服务', href: '/lv3/look'},
                    {icon: 'lf-icon-case', title: '病案管理服务', href: '/lv3/case'},
                ]
            },
            story: {},
            session: function (user) {
                logger.info(user);
                if (!user) return this.layout;
                return _.extend(_.extend({}, this.layout), {
                    menu: [
                        {title: "首 页", link: "/"},
                        {title: "为何选择心生命", link: "/whylf"},
                        {title: "病情和可选方案", link: "/choose"},
                        {title: "向别人学习", link: "/connect"},
                        {title: "支持服务", link: "/support"},
                        {title: "星生命故事", link: "/story"},
                        {title: "注 销", link: "/users/login?o=1"},
                        {title: user.fullname, link: "/users/center"}
                    ],
                    sessionuser:{_id:user.userid,fullname:user.fullname,photo:user.photo}
                })
            }
        },
        lv3: {
            coach: {
                icon: "lf-icon-coach",
                title: "星生命专家",
                subtitle: "私人专家让你保持健康",
                desc: "星生命专家员是训练有素的领航员，他们会耐心的解答您的癌症相关问题，快速引导您从我们的网站获得必需信息，或者帮助您浏览其他来源的信息。他们还将告诉您如何通过我们的网络咨询或电话咨询服务获得更详细的资讯，进而协助您联系到我们优质的海外服务。",
                link: [{
                    icon: "lf-icon-small-tel",
                    title: "电话",
                    desc: "86-9999-0987",
                    time: "8 am – 10 pm"
                },
                    {
                        icon: "lf-icon-small-txt",
                        title: "消息/语音/文字",
                        desc: "86-9999-0987",
                        time: "8 am – 10 pm"
                    },
                    {
                        icon: "lf-icon-small-email",
                        title: "电子邮件",
                        desc: "86-9999-0987",
                        time: "12小时回复"
                    }]

            },
            second: {
                icon: "lf-icon-second",
                title: "星生命健康咨询",
                subtitle: "星生命健康咨询",
                desc: "依据您提供的疾病信息，通过和您的单独交流，星生命会基于对您基本病情的了解，为您筛寻最佳的潜在治疗方案。我们提供网络咨询、电话咨询、单独咨询。如果您对向中国或美国的肿瘤学专家深入咨询感兴趣，请按如下方式联系星生命，我们将很乐意为您找到最佳方案，并且帮助您进行必要的规划预约。",
                link: [{
                    icon: "lf-icon-small-tel",
                    title: "电话",
                    desc: "86-9999-0987",
                    time: "8 am – 10 pm"
                },
                    {
                        icon: "lf-icon-small-txt",
                        title: "消息/语音/文字",
                        desc: "86-9999-0987",
                        time: "8 am – 10 pm"
                    },
                    {
                        icon: "lf-icon-small-email",
                        title: "电子邮件",
                        desc: "86-9999-0987",
                        time: "12小时回复"
                    }]

            },
            test: {
                icon: "lf-icon-test",
                title: "星生命临床试验",
                subtitle: "私人教练让你保持健康",
                desc: "星生命可安排您加入全球最新的临床试验目前很多新药临床试验仍然有国家和区域的限制，如果您希望尝试最新的抗肿瘤药物，我们的专家团队可以依据您提供的详细病情资料，先初步为您筛选可能参与的项目，再根据您的反馈意原和补充的治疗资料，为您仔细挑选最有可能被招募上的临床试验，最后还可以帮助您直接沟通问询具体相关事宜。请按如下方式联系星生命，我们将很乐意为您找到最佳方案，并且帮助您进行必要的规划预约。",
                link: [{
                    icon: "lf-icon-small-tel",
                    title: "电话",
                    desc: "86-9999-0987",
                    time: "8 am – 10 pm"
                },
                    {
                        icon: "lf-icon-small-txt",
                        title: "消息/语音/文字",
                        desc: "86-9999-0987",
                        time: "8 am – 10 pm"
                    },
                    {
                        icon: "lf-icon-small-email",
                        title: "电子邮件",
                        desc: "86-9999-0987",
                        time: "12小时回复"
                    }]

            },
            travl: {
                icon: "lf-icon-travl",
                title: "星生命医疗旅游",
                subtitle: "私人教练让你保持健康",
                desc: "星生命可以安排您参观一些美国顶级的肿瘤医院，拜访知名的肿瘤科医生，请按如下方式联系星生命，我们将很乐意为您找到最佳方案，并且帮助您进行必要的规划预约。",
                link: [{
                    icon: "lf-icon-small-tel",
                    title: "电话",
                    desc: "86-9999-0987",
                    time: "8 am – 10 pm"
                },
                    {
                        icon: "lf-icon-small-txt",
                        title: "消息/语音/文字",
                        desc: "86-9999-0987",
                        time: "8 am – 10 pm"
                    },
                    {
                        icon: "lf-icon-small-email",
                        title: "电子邮件",
                        desc: "86-9999-0987",
                        time: "12小时回复"
                    }]

            },
            look: {
                icon: "lf-icon-look",
                title: "星生命家庭护理和康复服务",
                subtitle: "私人教练让你保持健康",
                desc: "星生命可提供家庭护理和康复服务:电话康复服务,康复,营养䃼充,太极拳,针灸.请按如下方式联系星生命，我们将很乐意为您找到最佳方案，并且帮助您进行必要的规划预约",
                link: [{
                    icon: "lf-icon-small-tel",
                    title: "电话",
                    desc: "86-9999-0987",
                    time: "8 am – 10 pm"
                },
                    {
                        icon: "lf-icon-small-txt",
                        title: "消息/语音/文字",
                        desc: "86-9999-0987",
                        time: "8 am – 10 pm"
                    },
                    {
                        icon: "lf-icon-small-email",
                        title: "电子邮件",
                        desc: "86-9999-0987",
                        time: "12小时回复"
                    }]

            },
            case: {
                icon: "lf-icon-case",
                title: "病案管理服务",
                subtitle: "私人教练让你保持健康",
                desc: "星生命可提供病案管理服务,请按如下方式联系星生命，我们将很乐意为您找到最佳方案，并且帮助您进行必要的规划预约",
                link: [{
                    icon: "lf-icon-small-tel",
                    title: "电话",
                    desc: "86-9999-0987",
                    time: "8 am – 10 pm"
                },
                    {
                        icon: "lf-icon-small-txt",
                        title: "消息/语音/文字",
                        desc: "86-9999-0987",
                        time: "8 am – 10 pm"
                    },
                    {
                        icon: "lf-icon-small-email",
                        title: "电子邮件",
                        desc: "86-9999-0987",
                        time: "12小时回复"
                    }]

            }
        }
    }),

    cancer_az: _.extend(_.extend({}, dal), {
        "collectionName": "Cancer",
        "modelName": "cancer"
    }),

    Users: _.extend(_.extend({}, dal), {"collectionName": "Users", "modelName": "users"}),
    UsersProfile: _.extend(_.extend({}, dal), {"collectionName": "UsersProfile", "modelName": "profile"}),
    UsersLog: _.extend(_.extend({}, dal), {"collectionName": "UsersLog", "modelName": "userlog"}),
    ForumArticles: _.extend(_.extend({}, dal), {"collectionName": "ForumArticles", "modelName": "forumarticle"}),
    ForumReplies: _.extend(_.extend({}, dal), {"collectionName": "ForumReplies", "modelName": "forumreply"}),
    ForumTopics: _.extend(_.extend({}, dal), {
        "collectionName": "ForumTopics", "modelName": "forumtopic",
        initTopics: function () {
            var d = this.newModelData();
            var me = this;
            _.each(d, function (item) {
                me.insertData(item, function () {
                }, function () {
                });
            });

        },
        getTopics: function () {
            var me = this;
            logger.info("gettopics");
            return new Promise(function (reslove, reject) {
                me.doPromise(me.queryData, {})
                    .then(function (rtn) {
                            var tarray = [];
                            var topics = {};
                            logger.info(rtn.length);
                            _.each(rtn, function (topic, idx) {
                                if (!_.has(topics, topic.category)) {
                                    topics[topic.category] = {"category": topic.category, topic: []};
                                }

                                topics[topic.category]["topic"].push(topic);

                            });

                            _.each(topics, function (item, key) {
                                tarray.push(item);
                            });

                            reslove(tarray);
                        },
                        function (err) {
                            reject(err);
                        });

            });
        },

    }),
    CancerCategory: _.extend(_.extend({}, dal), {
        "collectionName": "CancerCategory", "modelName": "cancercategory",
        getCategory: function () {
            return this.newModelData();
        }
    })


};

module.exports = lifestar;