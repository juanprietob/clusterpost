
var request = require('request');
var fs = require('fs');
var Promise = require('bluebird');
var path = require('path');
var _ = require('underscore');
var qs = require('querystring');

const Joi = require('joi');
const Lab = require('lab');
const lab = exports.lab = Lab.script();

var couchProvider = require('./couch.provider');

const getConfigFile = function (env, base_directory) {
  try {
    // Try to load the user's personal configuration file
    return require(base_directory + '/conf.my.' + env + '.json');
  } catch (e) {
    // Else, read the default configuration file
    return require(base_directory + '/conf.' + env + '.json');
  }
};

var env = process.env.NODE_ENV;
if(!env) throw "Please set NODE_ENV variable.";

var conf = getConfigFile(env, "./");


couchProvider.setConfiguration(conf);

var job = {
        "executable": "cksum",
        "parameters": [
            {
                "flag": "",
                "name": "gravitational-waves-simulation.jpg"
            }
        ],
        "inputs": [
            {
                "name": "gravitational-waves-simulation.jpg"
            }
        ],
        "outputs": [
            {
                "type": "directory",
                "name": "./"
            },            
            {
                "type": "tar.gz",
                "name": "./"
            },
            {
                "type": "file",
                "name": "stdout.out"
            },
            {
                "type": "file",
                "name": "stderr.err"
            }
        ],
        "type": "job",
        "userEmail": "algiedi85@gmail.com"
    };
var couchdoc={
  "patientId": "C1",
  "type": "morphologicalData",
  // "_attachments": {
  //   "C1LM_pp_surfSPHARM.vtk": {
  //     "content_type": "application/octet-stream",
  //     "revpos": 2,
  //     "digest": "md5-WRUK0nHVbFh8xBzp0mBx6Q==",
  //     "length": 233514,
  //     "stub": true
  //   }, 
    // "attachments": {
    //     "C1LM_pp_surfSPHARM.vtk": {
    //         "path": "some/path/C1LM_pp_surfSPHARM.vtk"
    //     }
    // }
  }


var joiokres = Joi.object().keys({
                ok: Joi.boolean().valid(true),
                id: Joi.string(),
                rev: Joi.string()
            });
    
var result;

lab.experiment("Test clusterpost", function(){
    
    var docid = "";
    var testfile =  "/Users/loicmichoud/Desktop/shinytooth_dental/01R_pp_surfSPHARM.vtk";
    var array=testfile.split('/');
    var namefile=array[array.length-1];

    lab.test('returns true when document is created', function(){
        return couchProvider.uploadDocuments(couchdoc)
        .then(function(res){
            docid = res[0].id;
            Joi.assert(res, Joi.array().items(joiokres));
        });
    });
    
    lab.test('returns true when attachment is added to a document', function(){
        return couchProvider.getDocument(docid)
        .then(function(doc){
            var stream = fs.createReadStream(testfile);
            var nametest='';
            var j=0;
            for(var i in doc.attachments){
                if(j==1){
                    nametest=i;
                }
                j++;
            }            
            return couchProvider.addDocumentAttachment(doc, namefile, stream);
        });
    });
    lab.test('returns true when folder of attachment files is uploaded in couchDB', function(){
        return couchProvider.getDocument(docid)
        .then(function(doc){
            var pathFolder="/Users/loicmichoud/Desktop/folder_attachments";
            
            return couchProvider.addDocumentAttachmentFolder(doc, pathFolder);
        });
    });
    lab.test('returns true when we get the attachment', function(){
        return couchProvider.getDocument(docid)
        .then(function(doc){
            var filecontent = fs.readFileSync(testfile).toString();
            var nametest='';
            var j=0;
            for(var i in doc.attachments){
                if(j==1){
                    nametest=i;
                }
                j++;
            }
           return couchProvider.getDocumentAttachment(doc, 'folder_attachments/01R_pp_surfSPHARM.vtk')
           .then(function(dbfilecontent){

                var index = 0,
                length = filecontent.length,
                match = true;

                while (index < length) {
                    if (filecontent[index] === dbfilecontent[index]) {
                        index++;
                    } else {
                        match = false;
                        break;
                    }
                }
                if(match){
                    console.log("have the same content");
                }
                else{
                    console.log("are different");
                }

            });
        });
    });

    lab.test('returns true when we get the attachment through proxy interface', function(){
        var filecontent = fs.readFileSync(testfile).toString();
        return couchProvider.getDocument(docid)
        .then(function(doc){

            return new Promise(function(resolve, reject){
                var route='http://localhost:8000/test/'+docid+'/'+'01R_pp_surfSPHARM.vtk';
                var option={
                    uri: route
                }
                
                request(option, function(err, res, body){
                    if(err){
                        reject(err);
                    }else{ 
                        var content=body;
                         var index = 0,
                                length = filecontent.length,
                                match = true;

                                while (index < length) {
                                    if (filecontent[index] === content[index]) {
                                        index++;
                                    } else {
                                        match = false;
                                        break;
                                    }
                                }
                                if(match){
                                    console.log("have the same content");
                                }
                                else{
                                    console.log("are different");
                                }        
                        resolve(body);
                       
                    }
                });
            }); 
        });

    });

});






