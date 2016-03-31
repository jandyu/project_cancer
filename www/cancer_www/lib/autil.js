/**
 * Created by jrain on 16/2/13.
 */
module.exports = {
    encodeHTMLEntities: function (text) {
        var replacements = [
            ['amp', '&'],
            ['apos', '\''],
            ['lt', '<'],
            ['gt', '>']
        ];

        replacements.forEach(function (replace) {
            text = text.replace(new RegExp(replace[1], 'g'), '&' + replace[0] + ';');
        });

        return text;
    },
    /*
     *DateFormat
     *
     */
    DateFormat: function (dt, fmt) {
        var weekday = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
        var o = {
            "M+": dt.getMonth() + 1,                 //
            "d+": dt.getDate(),                    //
            "h+": dt.getHours(),                   //
            "m+": dt.getMinutes(),                 //
            "s+": dt.getSeconds(),                 //
            "q+": Math.floor((dt.getMonth() + 3) / 3), //season
            "S": dt.getMilliseconds(),             //
            "W": weekday[dt.getDay()]
        };

        if (/(y+)/.test(fmt))
            fmt = fmt.replace(RegExp.$1, (dt.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(fmt))
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    },
    GetDateOffset:function(dt,oSec,oMin,oHour,oDay){
        var t = dt.valueOf();

        return new Date(t + oSec * 1000 + oMin * 60 * 1000 + oHour * 60 *60 * 1000 + oDay * 24 * 60 * 60 * 1000  );
    }
}