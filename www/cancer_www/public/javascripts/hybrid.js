/*
 hybridPage.js

 xxx

 Created by Jrain on 14-5-13.
 Copyright © 2016年 jrain. All rights reserved.
 */
var console = {
    log: function (string) {
        var msg = {func:'functionOfConsoleLog',arg:string}
        window.webkit.messageHandlers.ngsj.postMessage(msg);
    },
    info:function(string){console.log(string);}
};


var hybridPage = {
    DEVICE_UDID: "#_DEVICE_UDID_#",
    userinfo: "#_userinfo_#",
    create: function (options) {
        var empty = {};
        var rtn = $.extend(empty, hybridPage, options);
        rtn.init();
        return rtn;
    },
    platForm: "ios",
    init: function () {
    },
    load: function () {
    },
    getNextPage: function () {
    },
    refreshPage: function () {
        window.location.reload();
    },
    Native: {
        SendMsgToNative: function (cmd, param) {
            var msg = {
                func: 'functionOf' + cmd,
                arg: param
            }
            window.webkit.messageHandlers.ngsj.postMessage(msg);
        },
        Alert: function (msg) {
            alert(msg);
        },
        Confirm: function (msg) {
            return confirm(msg);
        },
        Prompt: function (msg, desc) {
            return prompt(msg, desc);
        },
        PictureView: function (picurl) {
            this.SendMsgToNative("PictureView", picurl);
        },
        SetBadge: function (badegParam) {
            this.SendMsgToNative("SetBadge", badegParam);
        },
        InputString: function (title, callback) {
            var v = prompt(title);
            callback(v);
        },
        CloseWebBrower: function () {
            this.SendMsgToNative("CloseWebBrower", "")
        },
        PickImage: function (callbackname) {
            //
            this.SendMsgToNative("ChooseOrTakePhoto", callbackname);
        },
        NavToNewWebPage: function (pageurl) {
            this.SendMsgToNative("NavToNewWebPage", pageurl)
        },
        ScanBarcode: function (callbackname) {
            this.SendMsgToNative("ScanBarcode", callbackname);
        },
        OpenMessageView: function () {
            this.SendMsgToNative("OpenMessageView", "");
        },
        SetRightButton: function (btn) {
            //'{"title":"","img":""}'
            this.SendMsgToNative("SetRightButton", btn);
            //exec javascript rightButtonDo()
        },
        SetCanRefresh: function (b) {
            //'false' = '0'
            this.SendMsgToNative("SetCanRefresh", b);
        },
        OpenExternalLink: function (url) {
            //
            this.SendMsgToNative("OpenExternalLink", url);
        },
        Logout: function () {
            this.SendMsgToNative("Logout", "");
        },
        Login: function (uid, pwd) {
            var up = {"uid": uid, "pwd": pwd};
            this.SendMsgToNative("Login", JSON.stringify(up));
        },
        ToMain: function (uid) {
            this.SendMsgToNative("ToMain", uid);
        },
        ReloadPage: function () {
            this.SendMsgToNative("ReloadPage", "");
        }
    }
}
