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
        this.updateDataWhereWithData(query, mdata, callback, errback);
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
                    {title: "为何选择星生命", link: "/whylf"},
                    {title: "病情和可选方案", link: "/choose"},
                    {title: "向别人学习", link: "/connect"},
                    {title: "支持服务", link: "/support"},
                    {title: "星生命故事", link: "/story"},
                    {title: "我们的团队", link: "/team"},
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
                    {img: "/images/home/slide6.jpg", link: ""},
                    {img: "/images/home/slide7.jpg", link: ""}
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
                    //{icon: 'lf-icon-coach', title: '星生命专家', subtitle: '星生命专家让你保持健康', href: '/lv3/coach'},
                    //{icon: 'lf-icon-second', title: '健康咨询', subtitle: '远程咨询会诊', href: '/lv3/second'}
                ]
            },
            support: {
                link: [
                    {icon: 'lf-icon-case', title: '健康咨询', href: '/lv3/second'},
                    {icon: 'lf-icon-travl', title: '医疗旅游', href: '/lv3/travl'},
                    {icon: 'lf-icon-test', title: '临床试验服务', href: '/lv3/test'},
                    {icon: 'lf-icon-look', title: '康复服务', href: '/lv3/health1'},
                  //  {icon: 'lf-icon-case', title: '病案管理服务', href: '/lv3/case'},
                ]
            },
            story: {},
            team:{
                persons:[
                    {photo:"/images/team/ian.jpg",fullName:"Dr.Ian Hau",position:"Board Chairman",zh_name:"董事长",
                        profile:{
                            en:[
                                'An internationally recognized expert in the field of process improvement, analytics, and Healthcare IT with over 30 years of experience. ',
                                'Founder of Orchestrall, winner of Philly 100 for 2013, 2014.',
                                'Director of Smart Healthy City Alliance',
                                'Contracted President for Genesis Rehabilitation Services China',
                                'Previously served as SVP at Global Technology,  VP in Project and Process Management, and VP for R&D Portfolio Analytics for GlaxoSmithKline',
                                'He has developed and published the Fast Cycle Improvement methodology which has been adopted by several well known organizations such as University of Berkeley, University of Wisconsin & Penn State University.',
                                'Prior to joining GlaxoSmithKline, Dr. Hau was Assistant Professor at the Graduate School of Business and Research Fellow at the Center for Quality and Productivity Improvement at the University of Wisconsin-Madison '
                            ],
                            zh:[
                                '国际公认的医药健康资讯界专家，在信息科技的程序优化和分析领域拥有超过30年的经验。',
                                '美国Orchestrall医药健康资讯公司的创始人，2013年和2014年美国费城百家最有潜力公司的获得者。',
                                '美国智能健康城市联盟（ Smart Healthy City Alliance ）的总监',
                                '美国创世纪康复医疗服务公司（GRS）中国区总裁',
                                '此前曾长期担任葛兰素史克（GlaxoSmithKline）公司全球技术部高级副总裁，项目和流程管理部副总裁，以及项目研发投资组合分析部的副总裁',
                                '在加入葛兰素史克前， Dr. Ian Hau是美国威斯康星-麦迪逊大学工商管理研究生院副教授，质量和产量改善研究中心研究员。他的快速循环改进的方法学理论，已经被多家著名学术机构，如伯克利大学、威斯康星州立大学和宾夕法尼亚州立大学所采纳。'
                            ]
                        }
                    },
                    {photo:"/images/team/john.jpg",fullName:"Dr.Joh Balian",position:"Board Member",zh_name:"董事",
                        profile:{
                            en:[
                                'Dr. Balian is an Internist and Clinical Pharmacologist and is the former Chief Medical Officer and Chief R&D Operations Officer of Johnson & Johnson FCC. He also has served as a Senior Executive at Pfizer Inc and Bristol-Myers Squibb, all major health care, multinational corporations. Before joining the industry, Dr. Balian served for 5 years at the USFDA. He recently founded MediVista Consulting, LLC.  ',
                                'Dr. Balian received his BA from Columbia University in New York and MD degree form Tufts University School of Medicine in Boston. He serves on the board of Columbia University Armenian Center and Scientific Advisory Board of the China Smart Healthy City Association, and, Jubeln, Pharmiva, and Sonzia corporations among others. He is published widely in trade journals and is the author of an acclaimed novel “Gray Wolves and White Doves.”'
                            ],
                            zh:[
                                'Dr. John D. Balian是一位内科医生和临床药理学家，前强生（Johnson & Johnson）公司医药部主任和研发部主任。也曾担任辉瑞制药（Pfizer Inc ）和百时美施贵宝（Bristol-Myers Squibb) 高级主管。进入医药跨国公司前，他还在美国食品与药品管理局（FDA）任职 5 年，最近他创立了MediVista 健康咨询公司。',
                                'Dr. John D. Balian在哥伦比亚大学获得学士学位后继续在波士顿塔夫茨大学（ Tufts University ）医学院获得医学博士学位。现任哥伦比亚大学亚美尼亚中心和中国智能健康城市协会（China Smart Healthy City Association），以及Jubeln、Pharmiva、Sonzia 等公司机构的科学顾问。 Dr. John D. Balian兴趣爱好广泛，不仅在期刊杂志上发表大量专业文章，同时还是著名的小说“灰狼与白鸽”的作者。',
                            ]
                        }
                    },
                    {photo:"/images/team/neal.jpg",fullName:"Dr.Neal Naito Hau",position:"Clinical Board",zh_name:"董事(临床部)",
                        profile:{
                            en:[
                                'Dr. Naito is an Occupational Medicine/Internal Medicine specialist who was previously the Director of Public Health for the U.S. Navy. In that capacity, he developed and managed a multimillion dollar program portfolio in military medicine, mental health, clinical medicine, tropical infectious diseases, and pandemic planning. Currently, he does extensive healthcare consulting in the area of innovative service delivery models.'
                ],
                            zh:[
                                '职业医学和内科学医师，前美国海军公共卫生部主任。',
                                '任职期间，他统筹管理军事医学、心理健康、临床医学、热带传染病和流行病控制的数百万美元的整体项目方案。',
                                '目前Dr. Naito专注于医疗健康咨询服务的模式创新，并拥有丰富的服务经验。'
                            ]
                        }
                    },
                    {photo:"/images/team/fan.jpg",fullName:"Fan Zhou",position:"Marketing",zh_name:"市场部经理",
                        profile:{
                            en:[
                                'Studied in Jiangxi Agriculture University in electronic engineering major and received his BA from Temple University Fox School of Business and Management in Accounting and Finance major. ',
                                'Established TiaoXing Entertainment limited Company in Jiangxi Agriculture University when he was 17 in 2006. TiaoXing Entertainment dominated entertainment market in Jiangxi Agriculture University in 2007. ',
                                'Before coming to the US, Mr. Zhou worked in Sunrise Capital International, Inc in Guangzhou as Managing Partner’s(Sam Zhou) Assistant. When he was working in Sunrise Capital, he participated Agfeed Industries’ IPO which was the first Asian agricultural company trading in NASDAQ.'
                            ],
                            zh:[
                                '美国Temple大学福克斯商学院金融会计专业学士',
                                '在2006年（年仅17岁）创立跳星娱乐有限公司，主宰了江西农业大学娱乐市场。',
                                '曾担任Sunrise国际资本公司执行合伙人 Mr. Sam Zhou的助理，任职期间，他参与了艾格菲工业（ Agfeed Industries ）公司的IPO，这是成功在纳斯达克上市的第一家亚洲农业公司。'
                            ]
                        }
                    },
                    {photo:"/images/team/franky.jpg",fullName:"Franky Choi",position:"Board Member",zh_name:"执行董事",
                        profile:{
                            en:[
                                'Franky Choi is an IT executive with 25 years of experience in Program Management, Application Development, and Lean Six Sigma serving as Senior Program Director at GlaxoSmithKline, a major health care multinational corporation. Franky has experience developing health related websites, mobile web, and apps. He also has international experience leading the technology programs for GSK’s Shanghai R&D center and Asia HQ in Singapore.'
                            ],
                            zh:[
                                'IT主管，在项目管理、应用程序开发和精益六西格玛管理方面有25年的丰富经验。',
                                '长期担任葛兰素史克公司的高级项目总监，在开发与健康有关的网站，移动网站和程序应用。',
                                'Mr. Franky Choi曾经领导葛兰素史克公司的上海研发中心和新加坡亚洲总部的技术部门。'
                            ]
                        }
                    },
                    {photo:"/images/team/antican.jpg",fullName:"Dr.Antican Wang",position:"Oncology",zh_name:"肿瘤学顾问",
                        profile:{
                            en:[
                                'A scholar of translational medicine in American, with over 10 years of experience in Oncology research.',
                                'Dr. Wang received his Bachelor of Pharmacy , Master of Radiation Medicine and PhD of Oncology from Chinese Academy of Medical Sciences & Peking Union Medical College.',
                                'He has worked in the Cancer Hospital and Institute of Chinese Academy of Medical Sciences, mainly engaged in studying the origin of cancer stem cells and the potential of stem cells in the treatment of cancer.',
                                'In United States, he dedicated to the translational research and preclinical trials of immunotherapy for lung cancer, focused on the effects of genetic alterations of NIT1, IGFBP3, PD-1 and PD-L1 on Kras mutations in lung cancer, as well as preclinical studies of radiation enhancement of targeted therapy.',
                                'Because of aging society, pollution, increased survival and mental stress, China will have more cancer patients in the future. However, there still a long way to go from bench to bedside, and many other reasons greatly limiting Chinese patients to receive new treatments or clinical trials. So Dr. Wang hope can improve the survival and quality of life of Chinese cancer patients by providing basic and up-to-date information on clinical trials, and also to promote the rapid translation of Oncology Research.'

                            ],
                            zh:[
                                '旅美肿瘤学转化医学学者，具有10多年的肿瘤学研究经验。',
                                '获得药学学士后，又在中国医学科学院协和医科大学获得放射医学硕士和肿瘤学博士学位。',
                                '在中国医学科学院肿瘤研究所学习工作期间，主要从事肿瘤的干细胞起源和肿瘤的干细胞治疗研究。',
                                '在美国主要从事肺癌的基因突变基础研究和免疫治疗的临床试验转化研究，探讨了NIT1, IGFBP3, PD-1和PD-L1基因的改变对Kras突变肺癌的形成和治疗的影响。目前主要从事肺癌的纳米颗粒放疗制剂对于免疫抑制治疗的协同作用，以及肺癌靶向治疗药物的放射增敏临床前研究。',
                                'Dr. Antican Wang认为由于中国环境污染的恶化和生存及精神压力的增大，随着中国人口老龄化，未来将会有更多的癌症患者。然而基础肿瘤学的研究成果距离临床转化应用还有很长的路要走，还有很多其他原因，极大的限制了中国的癌症患者获得新的治疗方法和参与药物临床试验。因此Dr. Antican Wang将致力于通过为癌症患者提供基础和临床试验的最新信息，来促进肿瘤学研究成果的转化，提高中国癌症患者的生存率和生活质量。'
                            ]
                        }
                    }

                ]
            },
            session: function (user) {
                logger.info(user);
                if (!user) return this.layout;
                return _.extend(_.extend({}, this.layout), {
                    menu: [
                        {title: "首 页", link: "/"},
                        {title: "为何选择星生命", link: "/whylf"},
                        {title: "病情和可选方案", link: "/choose"},
                        {title: "向别人学习", link: "/connect"},
                        {title: "支持服务", link: "/support"},
                        {title: "星生命故事", link: "/story"},
                        {title: "我们的团队", link: "/team"},
                        {title: "注 销", link: "/users/login?o=1"},
                        {title: user.fullname, link: "/users/center"}
                    ],
                    sessionuser: {_id: user.userid, fullname: user.fullname, photo: user.photo}
                })
            }
        },
        lv3: {
            coach: {
                icon: "lf-icon-coach",
                title: "星生命专家",
                subtitle: "私人专家让你保持健康",
                desc: "星生命专家员是训练有素的领航员，他们会耐心的解答您的癌症相关问题，快速引导您从我们的网站获得必需信息，或者帮助您浏览其他来源的信息。他们还将告诉您如何通过我们的网络咨询或电话咨询服务获得更详细的资讯，进而协助您联系到我们优质的海外服务。",
                link: [
                    {
                        icon: "lf-icon-small-txt",
                        title: "微信联系",
                        desc: "微信联系",
                        time: "8 am – 10 pm"
                    },
                    {
                        icon: "lf-icon-small-email",
                        title: "xingshenging@outlook.com",
                        desc: "邮箱联系",
                        time: "12小时回复"
                    }]

            },
            second: {
                icon: "lf-icon-second",
                title: "星生命健康咨询",
                subtitle: "星生命健康咨询",
                desc: "依据您提供的疾病信息，通过和您的单独交流，星生命会基于对您基本病情的了解，为您筛寻最佳的潜在治疗方案。我们提供网络咨询、电话咨询、单独咨询。如果您对向中国或美国的肿瘤学专家深入咨询感兴趣，请按如下方式联系星生命，我们将很乐意为您找到最佳方案，并且帮助您进行必要的规划预约。",
                link: [ {
                    icon: "lf-icon-small-txt",
                    title: "微信联系",
                    desc: "微信联系",
                    time: "8 am – 10 pm"
                },
                    {
                        icon: "lf-icon-small-email",
                        title: "xingshenging@outlook.com",
                        desc: "邮箱联系",
                        time: "12小时回复"
                    }]

            },
            test: {
                icon: "lf-icon-test",
                title: "星生命临床试验",
                subtitle: "私人教练让你保持健康",
                desc: "星生命可安排您加入全球最新的临床试验。目前很多新药临床试验仍然有国家和区域的限制，如果您希望尝试最新的抗肿瘤药物，我们的专家团队可以依据您提供的详细病情资料，先初步为您筛选可能参与的项目，再根据您的反馈意原和补充的治疗资料，为您仔细挑选最有可能被招募上的临床试验，最后还可以帮助您直接沟通问询具体相关事宜。请按如下方式联系星生命，我们将很乐意为您找到最佳方案，并且帮助您进行必要的规划预约。",
                link: [ {
                    icon: "lf-icon-small-txt",
                    title: "微信联系",
                    desc: "微信联系",
                    time: "8 am – 10 pm"
                },
                    {
                        icon: "lf-icon-small-email",
                        title: "xingshenging@outlook.com",
                        desc: "邮箱联系",
                        time: "12小时回复"
                    }]

            },
            travl: {
                icon: "lf-icon-travl",
                title: "星生命医疗旅游",
                subtitle: "健康导游助您安全畅游",
                desc: "星生命可以安排您参观一些美国和香港顶级的肿瘤医院，拜访知名的肿瘤科医生，请按如下方式联系星生命，我们将很热忱为您搜寻最佳方案，协助您进行必要的行程规划和诊疗预约。",
                link: [ {
                    icon: "lf-icon-small-txt",
                    title: "微信联系",
                    desc: "微信联系",
                    time: "8 am – 10 pm"
                },
                    {
                        icon: "lf-icon-small-email",
                        title: "xingshenging@outlook.com",
                        desc: "邮箱联系",
                        time: "12小时回复"
                    }]

            },
            look: {
                icon: "lf-icon-look",
                title: "星生命家庭护理和康复服务",
                subtitle: "私人教练让你保持健康",
                desc: "星生命可提供家庭护理和康复服务:电话康复服务,康复,营养䃼充,太极拳,针灸.请按如下方式联系星生命，我们将很乐意为您找到最佳方案，并且帮助您进行必要的规划预约",
                link: [ {
                    icon: "lf-icon-small-txt",
                    title: "微信联系",
                    desc: "微信联系",
                    time: "8 am – 10 pm"
                },
                    {
                        icon: "lf-icon-small-email",
                        title: "xingshenging@outlook.com",
                        desc: "邮箱联系",
                        time: "12小时回复"
                    }]

            },
            case: {
                icon: "lf-icon-case",
                title: "病案管理服务",
                subtitle: "私人教练让你保持健康",
                desc: "星生命可提供病案管理服务,请按如下方式联系星生命，我们将很乐意为您找到最佳方案，并且帮助您进行必要的规划预约",
                link: [ {
                    icon: "lf-icon-small-txt",
                    title: "微信联系",
                    desc: "微信联系",
                    time: "8 am – 10 pm"
                },
                    {
                        icon: "lf-icon-small-email",
                        title: "xingshenging@outlook.com",
                        desc: "邮箱联系",
                        time: "12小时回复"
                    }]

            },
            health1:{
            },
            health2:{},
            health3:{}

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
            me.deleteData({}, function () {
                _.each(d, function (item) {
                    me.insertData(item, function () {
                    }, function () {
                    });
                });
            }, function () {
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
    }),
    CancerStage: _.extend(_.extend({}, dal), {
        "collectionName": "CancerCategory", "modelName": "cancerstage",
        getStage: function () {
            return this.newModelData();
        }
    }),
    CancerResource: _.extend(_.extend({}, dal), {
        "collectionName": "CancerResource", "modelName": "cancerresource",
        getResList: function () {
            return this.newModelData();
        },
        getResourceName: function (id) {
            var lst = this.newModelData();
            return _.find(lst,function(item){return item.value==id});
        }
    })


};

module.exports = lifestar;