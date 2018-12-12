'use strict'
var request = require('request');
var fs = require('fs');
var Promise = require('bluebird');
var path = require('path');
var _ = require('underscore');
var Joi = require('joi');
var clustermodel = require("clusterpost-model");
var qs = require('querystring');
var prompt = require('prompt');
var os = require('os');
var jws = require('jsonwebtoken');
var HapiJWTCouch = require('hapi-jwt-couch-lib')

class ClusterpostLib extends HapiJWTCouch{
    constructor(){
        super()
        this.configfilename = path.join(process.cwd(), '.clusterpost-config.json');
        this.joiconf = Joi.object().keys({
            uri: Joi.string().uri(),
            token: Joi.string()
        });
        this.joiokres = Joi.object().keys({
            ok: Joi.boolean().valid(true),
            id: Joi.string(),
            rev: Joi.string()
        });
    }

    setConfigFileName(configfilename){
        this.configfilename = configfilename;
    }

    getConfigFileName(){
        return this.configfilename;
    }

    setClusterPostServer (uri){
        this.setServer(uri);
    }

    getClusterPostServer(){
        return this.getServer()
    }

    getConfigFile() {
      try {
        // Try to load the user's personal configuration file in the current directory
        var conf = require(this.configfilename);
        Joi.assert(conf, this.joiconf);
        return conf;
      } catch (e) {
        return null;
      }
    };

    setConfigFile (config) {
      try {
        // Try to save the user's personal configuration file in the current working directory
        var confname = this.configfilename;
        console.log("Writing configuration file", confname);
        fs.writeFileSync(confname, JSON.stringify(config));
      } catch (e) {
        console.error(e);
      }
    };

    getExecutionServers(){
        var self = this;
        return new Promise(function(resolve, reject){
            var options = {
                url : self.getServer() + "/executionserver",
                method: "GET",
                agentOptions: self.agentOptions,
                auth: self.auth
            }

            request(options, function(err, res, body){
                if(err){
                    reject(err);
                }else{
                    resolve(JSON.parse(body));
                }
            });


        });
    }

    createDocument(job){

        var self = this;
        return new Promise(function(resolve, reject){
            var options = {
                url : self.getServer() + "/dataprovider",
                method: "POST",
                json: job,
                agentOptions: self.agentOptions,
                auth: self.auth
            }

            request(options, function(err, res, body){
                if(err){
                    reject(err);
                }else if(res.statusCode !== 200){
                    console.error(err);
                    reject(body);
                }else{
                    resolve(body);
                }
            });
        });
    }

    getDocument(id){
        Joi.assert(id, Joi.string().alphanum());
        var self = this;
        return new Promise(function(resolve, reject){
            var options = {
                url : self.getServer() + "/dataprovider/" + id,
                method: "GET",
                agentOptions: self.agentOptions,
                auth: self.auth
            }

            request(options, function(err, res, body){
                if(err){
                    reject(err);
                }else{
                    resolve(JSON.parse(body));
                }
            });
        });
    }

    updateDocument(doc){
        Joi.assert(doc, clustermodel.job);
        var self = this;
        return new Promise(function(resolve, reject){
            try{
                var options = { 
                    uri: self.getServer() + "/dataprovider",
                    method: 'PUT', 
                    json : doc, 
                    agentOptions: self.agentOptions,
                    auth: self.auth
                };
                
                request(options, function(err, res, body){
                    if(err) resolve(err);
                    resolve(body);
                });
            }catch(e){
                reject(e);
            }
            
        });
    }

    updateDocuments(docs){
        var self = this;
        return Promise.map(docs, function(doc){
            return self.updateDocument(doc);
        }, {concurrency: 1});
    }

    getUserJobs(params){
        var self = this;
        return new Promise(function(resolve, reject){
            var options = {
                url : self.getServer() + "/dataprovider/user?" + qs.stringify(params),
                method: "GET",
                agentOptions: self.agentOptions,
                auth: self.auth
            }

            request(options, function(err, res, body){
                if(err){
                    reject(err);
                }else{
                    resolve(JSON.parse(body));
                }
            });
        });
    }

    getJobs(executable, jobstatus, email){

        var params = {};
        var self = this;

        if(executable){
            params.executable = executable;
        }

        if(jobstatus){
            params.jobstatus = jobstatus;
        }

        if(email){
            params.userEmail = email;
        }

        return self.getUserJobs(params);
        
    }

    getExecutionServerJobs(executionserver, jobstatus){

        var params = {};
        var self = this;

        if(executionserver){
            params.executionserver = executionserver;
        }

        if(jobstatus){
            params.jobstatus = jobstatus;
        }        

        return self.getUserJobs(params);
        
    }

    getDocumentAttachment(id, name){
        Joi.assert(id, Joi.string().alphanum())
        Joi.assert(name, Joi.string())
        var self = this;
        return new Promise(function(resolve, reject){
            var options = {
                url : self.getServer() + "/dataprovider/" + id + "/" + name,
                method: "GET",
                agentOptions: self.agentOptions,
                auth: self.auth
            }

            request(options, function(err, res, body){
                if(err){
                    reject(err);
                }else{
                    resolve(body);
                }
            });
        });
    }

    /*
    *   Download an attachment from the DB
    *   
    */
    getDocumentAttachmentSave(id, name, filename){
        Joi.assert(id, Joi.string().alphanum())
        Joi.assert(name, Joi.string())
        Joi.assert(filename, Joi.string())
        var self = this;
        return new Promise(function(resolve, reject){

            try{

                var options = {
                    url : self.getServer() + "/dataprovider/" + id + "/" + encodeURIComponent(name),
                    method: "GET",
                    agentOptions: self.agentOptions,
                    auth: self.auth
                }

                var writestream = fs.createWriteStream(filename);
                request(options).pipe(writestream);

                writestream.on('finish', function(err){                 
                    if(err){
                        reject({
                            "path" : filename,
                            "status" : false,
                            "error": err
                        });
                    }else{
                        resolve({
                            "path" : filename,
                            "status" : true
                        });
                    }
                });

            }catch(e){
                reject(e);
            }
        });
    }

    getDownloadToken(id, name){
        Joi.assert(id, Joi.string().alphanum())
        Joi.assert(name, Joi.string())
        var self = this;
        return new Promise(function(resolve, reject){
            var options = {
                url : self.getServer() + "/dataprovider/download/" + id + "/" + name,
                method: "GET",
                agentOptions: self.agentOptions,
                auth: self.auth
            }

            request(options, function(err, res, body){
                if(err){
                    reject(err);
                }else{
                    resolve(JSON.parse(body));
                }
            });
        });
    }

    downloadAttachment(token){
        Joi.assert(token, Joi.string())
        var self = this;
        return new Promise(function(resolve, reject){
            var options = {
                url : self.getServer() + "/dataprovider/download/" + token,
                method: "GET",
                agentOptions: self.agentOptions
            }

            request(options, function(err, res, body){
                if(err){
                    reject(err);
                }else{
                    resolve(body);
                }
            });
        });
    }

    /*
    *   Uploads a file to the database. 
    *   jobid is required
    *   filename is required
    *   name is optional. 
    */
    uploadFile(jobid, filename, name){
        Joi.assert(jobid, Joi.string().alphanum())
        Joi.assert(filename, Joi.string())
        var self = this;
        return new Promise(function(resolve, reject){

            if(name === undefined){
                name = path.basename(filename);
            }else{
                name = encodeURIComponent(name);
            }

            try{
                var options = {
                    url : self.getServer() + "/dataprovider/" + jobid + "/" + name,
                    method: "PUT",
                    agentOptions: self.agentOptions,
                    headers: { 
                        "Content-Type": "application/octet-stream"
                    },
                    auth: self.auth
                }

                var fstat = fs.statSync(filename);
                if(fstat){

                    var stream = fs.createReadStream(filename);

                    stream.pipe(request(options, function(err, res, body){
                            if(err){
                                reject(err);
                            }else{
                                resolve(JSON.parse(body));
                            }
                        })
                    );
                }else{
                    reject({
                        "error": "File not found: " + filename
                    })
                }
            }catch(e){
                reject(e);
            }

        });
    }

    uploadFiles(jobid, filenames, names){
        var self = this;
        return Promise.map(filenames, function(filename, index){
            if(names !== undefined){
                return self.uploadFile(jobid, filename, names[index]);
            }
            return self.uploadFile(jobid, filename);
        }, {concurrency: 1})
        .then(function(allupload){
            return allupload;
        });
    }

    executeJob(jobid, force){
        Joi.assert(jobid, Joi.string().alphanum())
        var self = this;
        return new Promise(function(resolve, reject){
            try{
                var options = {
                    url : self.getServer() + "/executionserver/" + jobid,
                    json: {
                        force: force
                    },
                    method: "POST",
                    agentOptions: self.agentOptions,
                    auth: self.auth
                }

                request(options, function(err, res, body){
                    if(err){
                        reject(err);
                    }else{
                        resolve(body);
                    }
                });
            }catch(e){
                reject(e);
            }
        });
    }

    updateJobStatus(jobid){
        Joi.assert(jobid, Joi.string().alphanum())
        var self = this;
        return new Promise(function(resolve, reject){
            try{
                var options = {
                    url : self.getServer() + "/executionserver/" + jobid,
                    method: "GET",
                    agentOptions: self.agentOptions,
                    auth: self.auth
                }

                request(options, function(err, res, body){
                    if(err){
                        reject(err);
                    }else{
                        resolve(JSON.parse(body));
                    }
                });
            }catch(e){
                reject(e);
            }
        });
    }

    killJob(jobid){
        Joi.assert(jobid, Joi.string().alphanum())
        var self = this;
        return new Promise(function(resolve, reject){
            var options = {
                url : self.getServer() + "/executionserver/" + jobid,
                method: "DELETE",
                agentOptions: self.agentOptions,
                auth: self.auth
            }

            request(options, function(err, res, body){
                if(err){
                    reject(err);
                }else{
                    resolve(JSON.parse(body));
                }
            });
        });
    }

    deleteJob(jobid){
        Joi.assert(jobid, Joi.string().alphanum())
        var self = this;
        return new Promise(function(resolve, reject){
            var options = {
                url : self.getServer() + "/dataprovider/" + jobid,
                method: "DELETE",
                agentOptions: self.agentOptions,
                auth: self.auth
            }

            request(options, function(err, res, body){
                if(err){
                    reject(err);
                }else{
                    resolve(JSON.parse(body));
                }
            });
        });
    }

    checkFiles(files){
        return Promise.map(files, function(filename){
            var stat = fs.statSync(filename);
            if(stat){
                return true;
            }
        });
    }

    createAndSubmitJob(job, files, names){
        var prom;
        var self = this;
        if(files){
            prom = self.checkFiles(files)
            .then(function(){
                return self.createDocument(job);
            })
            .then(function(res){
                var jobid = res.id;
                return self.uploadFiles(jobid, files, names)
                .then(function(){
                    return jobid;
                });
            });
        }else{
            prom = self.createDocument(job)
            .then(function(res){
                var jobid = res.id;
                return jobid;
            });
        }
        return prom
        .then(function(jobid){
            return self.executeJob(jobid)
            .then(function(res){
                return jobid;
            });
        });
    }

    mkdirp(outputdir){

        var pathparse = path.parse(outputdir);
        var allpatharray = outputdir.split(path.sep);
        var currentpath = pathparse.root;
        _.each(allpatharray, function(p){
            currentpath = path.join(currentpath, p);
            try{
                fs.statSync(currentpath);
            }catch(e){
                try{
                    fs.mkdirSync(currentpath);
                }catch(e){
                    console.error(e);
                    throw e;
                }
            }
        });
    }

    getJobOutputs(job, outputdir){
        
        var outputs = job.outputs;
        var self = this;

        return Promise.map(outputs, function(output){
            var name = output.name;
            if(output.type === "tar.gz" && name === "./"){
                name = job._id + ".tar.gz";
            }else if(output.type === "tar.gz" && path.parse(name).ext !== ".tar.gz"){
                name = output.name + ".tar.gz";
            }
            if(name.indexOf("./") === 0){
                name = name.slice(2);
            }
            if(outputdir){
                var filename = path.join(outputdir, name);
                console.log("Downloading file:", filename)
                self.mkdirp(path.parse(filename).dir);//Creates directories in case the file is stored as path form
                return self.getDocumentAttachmentSave(job._id, name, filename);
            }else{
                return self.getDocumentAttachment(job._id, name);
            }
        });
    }

    getDeleteQueue(){
        var self = this;

        return new Promise(function(resolve, reject){
            var options = {
                url : self.getServer() + "/executionserver/deletequeue",
                method: "GET",
                agentOptions: self.agentOptions,
                auth: self.auth
            }

            request(options, function(err, res, body){
                if(err){
                    reject(err);
                }else{
                    resolve(JSON.parse(body));
                }
            });
        });
    }

    promptUsernamePassword(){
        return new Promise(function(resolve, reject){
            var schema = {
                properties: {
                    email: {
                        pattern: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                        message: 'Email address',
                        required: true
                    },
                    password: {                    
                        hidden: true,
                        required: true
                    }
                }
            };
            prompt.start();
            prompt.get(schema, function (err, result) {
                if(err){
                    reject(err)
                }else{
                    resolve(result);
                }
            });
        });
    }

    promptClusterpostServer(){
        return new Promise(function(resolve, reject){
            var schema = {
                properties: {
                    uri: {
                        message: 'Please enter the clusterpost server uri',
                        required: true
                    }
                }
            };
            prompt.start();
            prompt.get(schema, function (err, result) {
                if(err){
                    reject(err)
                }else{
                    resolve(result);
                }
            });
        });
    }

    testUserToken(token){
        var jwt = jws.decode(token.token);

        if(jwt.exp && jwt.exp < Date.now() / 1000){
            return false;
        }else if(jwt.exp === undefined){
            console.log("WARNING! The token does not have an expiry date. Tokens without expiry date were deprecated. The clusterpost-server could be running an old version. Please contact the clusterpost-server administrator.");
        }
        return true;
    }

    start(configfilename){
        var self = this;

        if(configfilename){
            self.setConfigFileName(configfilename);
        }
        var config = self.getConfigFile();

        if(config){
            self.setClusterPostServer(config.uri);
            if(self.testUserToken(config)){
                self.setUserToken(config);
                return Promise.resolve();
            }else{
                return self.promptUsernamePassword()
                .then(function(user){
                    return self.userLogin(user);
                })
                .then(function(token){
                    _.extend(token, {
                        uri: self.getClusterPostServer()
                    });
                    self.setConfigFile(token);
                });
            }
        }else{
            return self.promptClusterpostServer()
            .then(function(server){
                self.setClusterPostServer(server);
                return self.promptUsernamePassword()
            })
            .then(function(user){
                return self.userLogin(user);
            })
            .then(function(token){
                _.extend(token, {
                    uri: self.getClusterPostServer()
                });
                self.setConfigFile(token);
            });
        }
    }

}

module.exports = new ClusterpostLib()