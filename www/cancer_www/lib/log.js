/**
 * Created by jrain on 16/1/21.
 */

var log4js = require("log4js");
log4js.configure('log4js.json', { reloadSecs: 300 });

module.exports = {
    httplog:log4js.connectLogger(log4js.getLogger("http"), {level: 'auto'}),
    sqllog:log4js.getLogger("sql"),
    msglog:log4js.getLogger("message"),
    payment:log4js.getLogger("payment")
};

/*
logger.trace('Entering cheese testing');
logger.debug('Got cheese.');
logger.info('Cheese is Gouda.');
logger.warn('Cheese is quite smelly.');
logger.error('Cheese is too ripe!');
logger.fatal('Cheese was breeding ground for listeria.');
*/