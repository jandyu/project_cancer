
var express = require('express');
var router = express.Router();
var Upload = require('upload-file');
var autil = require("../lib/autil");
var uuid = require("uuid");
var logger = require("../lib/log").sqllog;


router.post('/:style?', function(req, res) {
    var path = req.params.style?req.params.style:"images";
    var upload = new Upload({
        maxNumberOfFiles: 10,
        // Byte unit
        maxFileSize: 1024 * 1024 * 10,
        acceptFileTypes: /(\.|\/)(gif|jpe?g|png|css|zip)$/i,
        dest: 'public/uploads/'+path+'/'+ autil.DateFormat(new Date(),"yyyy-MM-dd"),
        minNumberOfFiles: 0,
        rename:function(name,file){
            logger.info("rename");
            logger.info(name);
            logger.info(file);

            var ext = file.filename.split(".");

            var fname = uuid.v1().replace(/-/g,"") +"."+ ext[ext.length - 1];
            //file.filename = fname;
            file.path = upload.options.dest.substr(6) + "/"+ fname;
            return fname;
        }
    });

    upload.on('end', function(fields, files) {
        //rename files
        logger.info("upload return");
        logger.info(fields);
        logger.info(files);
        for(f in files){
           res.send(files[f].path);
            return;
        };

    });

    upload.on('error', function(err) {
        res.send(err);
    });
    //save
    upload.parse(req);
});

module.exports = router;