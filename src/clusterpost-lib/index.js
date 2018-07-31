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
        this.configfilename = '.clusterpost-config.json';
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

    setClusterPostServer (uri){
        this.setServer(uri);
    }

    getConfigFile() {
      try {
        // Try to load the user's personal configuration file in the current directory
        var conf = require(path.join(process.cwd(), this.configfilename));
        Joi.assert(conf, this.joiconf);
        return conf;
      } catch (e) {
        return null;
      }
    };

    setConfigFile (config) {
      try {
        // Try to save the user's personal configuration file in the current working directory
        var confname = path.join(process.cwd(), this.configfilename);
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

        if(executable){
            params.executable = executable;
        }

        if(jobstatus){
            params.jobstatus = jobstatus;
        }

        if(email){
            params.userEmail = email;
        }

        return getUserJobs(params);
        
    }

    getExecutionServerJobs(executionserver, jobstatus){

        var params = {};

        if(executionserver){
            params.executionserver = executionserver;
        }

        if(jobstatus){
            params.jobstatus = jobstatus;
        }        

        return getUserJobs(params);
        
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
            prom = checkFiles(files)
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
                mkdirp(path.parse(filename).dir);//Creates directories in case the file is stored as path form
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

}

module.exports = new ClusterpostLib()