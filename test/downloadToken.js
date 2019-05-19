
var request = require('request');
var fs = require('fs');
var Promise = require('bluebird');
var path = require('path');
var _ = require('underscore');
var qs = require('querystring');

const Joi = require('@hapi/joi');
const Lab = require('lab');
const lab = exports.lab = Lab.script();

var clusterpost = require("clusterpost-lib");
var clustermodel = require('clusterpost-model');

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

console.log("Using the following configuration for test:", JSON.stringify(conf, null, 2));

var agentOptions = {};

if(conf.tls && conf.tls.cert){
    agentOptions.ca = fs.readFileSync(conf.tls.cert);
}

clusterpost.setClusterPostServer(conf.uri);
clusterpost.setAgentOptions(agentOptions);

var inputs = [
	"./data/gravitational-waves-simulation.jpg"
];
var jobid;

var updateJobStatusRec = function(jobid, validstatus){
    var clustermodelstatus = Joi.object().keys({
        jobid: Joi.number(),
        status: Joi.string().valid(validstatus),
        downloadstatus: Joi.array().items(Joi.object().keys({
            path: Joi.string(),
            status: Joi.boolean().valid(true)
        })), 
        uploadstatus: Joi.array().items(Joi.object())
    });

    return new Promise(function(resolve, reject){
        setTimeout(resolve, 65000);
    })
    .then(function(){
        return clusterpost.updateJobStatus(jobid)
        .then(function(jobstatus){
            Joi.assert(jobstatus, clustermodelstatus);
            return jobstatus;
        })
        .catch(function(e){
            return updateJobStatusRec(jobid);
        });
    })
}

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
        "executionserver": "localhost",
        "userEmail": "someemail@gmail.com"
    };

var user = {
    email: "someemail@gmail.com",
    name: "Some email",
    password: "Some808Password!"
}

var joiokres = Joi.object().keys({
                ok: Joi.boolean().valid(true),
                id: Joi.string(),
                rev: Joi.string()
            });

lab.experiment("Test clusterpost", function(){
    

    lab.test('returns true when new user is created.', function(){

        return clusterpost.createUser(user)
        .then(function(res){
            Joi.assert(res.token, Joi.string().required());
            return new Promise(function(resolve, reject){

                var params = {
                    key: '"someemail@gmail.com"',
                    include_docs:true
                }

                var options = { 
                    uri: conf.couchdb + "/_design/user/_view/info?" + qs.stringify(params),
                    method: 'GET'
                };

                request(options, function(err, res, body){
                    
                    var user = _.pluck(JSON.parse(body).rows, "doc")[0];
                    
                    user.scope.push('clusterpost');

                    var options = { 
                        uri: conf.couchdb + "/_bulk_docs",
                        method: 'POST', 
                        json : {
                            docs: [user]
                        }
                    };
                    
                    request(options, function(err, res, body){

                        if(err){
                            reject(err);
                        }else if(body.error){
                            reject(body.error);
                        }else{
                            resolve(body);
                        }
                    });
                });
            });
        });
        
    });

    lab.test('returns true when user is logged in.', function(){

        var user = {
            email: "someemail@gmail.com",
            password: "Some808Password!"
        }

        return clusterpost.userLogin(user)
        .then(function(res){
            Joi.assert(res.token, Joi.string().required())
            console.log(res.token)
        });
        
    });

    lab.test('returns true when document is created', function(){

        return clusterpost.createDocument(job)
        .then(function(res){
            console.log(res);
            Joi.assert(res, joiokres);
            jobid = res.id;
            console.info("JOBID:", jobid);
        });
    });

    lab.test('returns true when attachment is added', function(){
        
        return clusterpost.uploadFiles(jobid, inputs)
        .then(function(allupload){
            var joiupload = Joi.array().items(joiokres).min(1);
            Joi.assert(allupload, joiupload);
        });
    });
    

    lab.test('returns true if get attachment output stream is valid using a download token', function(done){

        clusterpost.getDownloadToken(jobid, path.basename(inputs[0]))
        .then(function(res){

            Joi.assert(res.token, Joi.string());
            return clusterpost.downloadAttachment(res.token);
        })
        .then(function(inputdata){
            done();
        });
    });

    lab.test('returns true if the document is deleted', function(){
        return clusterpost.deleteJob(jobid)
        .then(function(res){
            Joi.assert(res, joiokres);
        });
    });

    lab.test('returns true when valid user deletes itself.', function(){

        return clusterpost.deleteUser()
        .then(function(res){
            Joi.assert(res, Joi.object().keys({ 
                ok: Joi.boolean(),
                id: Joi.string(),
                rev: Joi.string()
            }));
        });
    });
    
});