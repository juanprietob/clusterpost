
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
var configfilename = '.clusterpost-config.json'
var joiconf = Joi.object().keys({
        uri: Joi.string().uri(),
        token: Joi.string()
    });
var jws = require('jsonwebtoken');

var clusterpost = {};

clusterpost.auth = {};

clusterpost.joiokres = Joi.object().keys({
    ok: Joi.boolean().valid(true),
    id: Joi.string(),
    rev: Joi.string()
});

var setClusterPostServer = function(uri){
    if(_.isObject(uri)){
        _.extend(clusterpost, uri);
    }else{
        clusterpost.uri = uri;
    }
}

var getClusterPostServer = function(){
    return clusterpost.uri 
}

clusterpost.agentOptions = {};

var setAgentOptions = function(agentOptions){
    clusterpost.agentOptions = agentOptions;
}

var createUser = function(user){
    return new Promise(function(resolve, reject){
        var options = {
            url: getClusterPostServer() + "/auth/user",
            method: 'POST',
            json: user,
            agentOptions: clusterpost.agentOptions
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

var userLogin = function(user){
    return new Promise(function(resolve, reject){
        var options = {
            url: getClusterPostServer() + "/auth/login",
            method: 'POST',
            json: user,
            agentOptions: clusterpost.agentOptions
        }

        request(options, function(err, res, body){
            if(err){
                reject(err);
            }else{
                clusterpost.auth.bearer = body.token
                resolve(body);
            }
        });
    });
}

var getUsernamePassword = function(){
    console.info("Please use promptUsernamePassword() instead, this function will be deprecated");
    return promptUsernamePassword();
}

var promptUsernamePassword = function(){
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

var promptClusterpostServer = function(){
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

var getConfigFile = function () {
  try {
    // Try to load the user's personal configuration file in the current directory
    var conf = require(path.join(process.cwd(), configfilename));
    Joi.assert(conf, joiconf);
    return conf;
  } catch (e) {
    // Else, read the default configuration file
    return null;
  }
};

var setConfigFile = function (config) {
  try {
    // Try to load the user's personal configuration file in the current directory
    fs.writeFileSync(path.join(process.cwd(), configfilename), JSON.stringify(config));
  } catch (e) {
    console.error(e);
  }
};

var start = function(){
    var config = getConfigFile();
    if(config){
        
        setClusterPostServer(config.uri);
        if(testUserToken(config)){
            setUserToken(config);
            return Promise.resolve();
        }else{
            return promptUsernamePassword()
            .then(function(user){
                return userLogin(user);
            })
            .then(function(token){
                _.extend(token, {
                    uri: getClusterPostServer()
                });
                setConfigFile(token);
            });
        }
    }else{
        return promptClusterpostServer()
        .then(function(server){
            setClusterPostServer(server);
            return promptUsernamePassword()
        })
        .then(function(user){
            return userLogin(user);
        })
        .then(function(token){
            _.extend(token, {
                uri: getClusterPostServer()
            });
            setConfigFile(token);
        });
    }
}

var testUserToken = function(token){
    var jwt = jws.decode(token.token);

    if(jwt.exp && jwt.exp < Date.now() / 1000){
        return false;
    }else if(jwt.exp === undefined){
        console.log("WARNING! The token does not have an expiry date. Tokens without expiry date were deprecated. The clusterpost-server could be running an old version. Please contact the clusterpost-server administrator.");
    }
    return true;
}

var setUserToken = function(token){
    if(_.isObject(token)){
        if(token.token){
            clusterpost.auth.bearer = token.token;
        }else{
            console.error("setUserToken: ", JSON.stringify(token));
            throw "Invalid token set for auth mechanism, must be an object {'token': 'someAuthToken'}";
        }
    }else{
        clusterpost.auth.bearer = token;
    }
}

var getUserToken = function(){
    return clusterpost.auth.bearer;
}

var getUser = function(){
    return new Promise(function(resolve, reject){
        var options = {
            url: getClusterPostServer() + "/auth/user",
            method: 'GET',
            auth: clusterpost.auth,
            agentOptions: clusterpost.agentOptions
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

var getUsers = function(){
    return new Promise(function(resolve, reject){
        var options = {
            url: getClusterPostServer() + "/auth/users",
            method: 'GET',
            auth: clusterpost.auth,
            agentOptions: clusterpost.agentOptions
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

var updateUser = function(userinfo){

    return new Promise(function(resolve, reject){
        var options = {
            url: getClusterPostServer() + "/auth/user",
            method: 'PUT',
            json: userinfo,
            auth: clusterpost.auth,
            agentOptions: clusterpost.agentOptions
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

var deleteUser = function(){
    return new Promise(function(resolve, reject){
        var options = {
            url: getClusterPostServer() + "/auth/user",
            method: 'DELETE',
            agentOptions: clusterpost.agentOptions,
            auth: clusterpost.auth
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

var deleteUsers = function(user){
    return new Promise(function(resolve, reject){
        var options = {
            url: getClusterPostServer() + "/auth/users",
            method: 'DELETE',
            agentOptions: clusterpost.agentOptions,
            auth: clusterpost.auth,
            json: user
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

var getExecutionServers = function(){
    return new Promise(function(resolve, reject){
        var options = {
            url : getClusterPostServer() + "/executionserver",
            method: "GET",
            agentOptions: clusterpost.agentOptions,
            auth: clusterpost.auth
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

var createDocument = function(job){

    return new Promise(function(resolve, reject){
        var options = {
            url : getClusterPostServer() + "/dataprovider",
            method: "POST",
            json: job,
            agentOptions: clusterpost.agentOptions,
            auth: clusterpost.auth
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

var getDocument = function(id){
    Joi.assert(id, Joi.string().alphanum());
    return new Promise(function(resolve, reject){
        var options = {
            url : getClusterPostServer() + "/dataprovider/" + id,
            method: "GET",
            agentOptions: clusterpost.agentOptions,
            auth: clusterpost.auth
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

var updateDocument = function(doc){
    Joi.assert(doc, clustermodel.job);
    return new Promise(function(resolve, reject){
        try{
            var options = { 
                uri: getClusterPostServer() + "/dataprovider",
                method: 'PUT', 
                json : doc, 
                agentOptions: clusterpost.agentOptions,
                auth: clusterpost.auth
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

var getJobs = function(executable, jobstatus, email){
    return new Promise(function(resolve, reject){

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

        var options = {
            url : getClusterPostServer() + "/dataprovider/user?" + qs.stringify(params),
            method: "GET",
            agentOptions: clusterpost.agentOptions,
            auth: clusterpost.auth
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

var getDocumentAttachment = function(id, name){
    Joi.assert(id, Joi.string().alphanum())
    Joi.assert(name, Joi.string())
    return new Promise(function(resolve, reject){
        var options = {
            url : getClusterPostServer() + "/dataprovider/" + id + "/" + name,
            method: "GET",
            agentOptions: clusterpost.agentOptions,
            auth: clusterpost.auth
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
var getDocumentAttachmentSave = function(id, name, filename){
    Joi.assert(id, Joi.string().alphanum())
    Joi.assert(name, Joi.string())
    Joi.assert(filename, Joi.string())
    return new Promise(function(resolve, reject){

        try{

            var options = {
                url : getClusterPostServer() + "/dataprovider/" + id + "/" + encodeURIComponent(name),
                method: "GET",
                agentOptions: clusterpost.agentOptions,
                auth: clusterpost.auth
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

var getDownloadToken = function(id, name){
    Joi.assert(id, Joi.string().alphanum())
    Joi.assert(name, Joi.string())
    return new Promise(function(resolve, reject){
        var options = {
            url : getClusterPostServer() + "/dataprovider/download/" + id + "/" + name,
            method: "GET",
            agentOptions: clusterpost.agentOptions,
            auth: clusterpost.auth
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

var downloadAttachment = function(token){
    Joi.assert(token, Joi.string())
    return new Promise(function(resolve, reject){
        var options = {
            url : getClusterPostServer() + "/dataprovider/download/" + token,
            method: "GET",
            agentOptions: clusterpost.agentOptions
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
var uploadFile = function(jobid, filename, name){
    Joi.assert(jobid, Joi.string().alphanum())
    Joi.assert(filename, Joi.string())
	return new Promise(function(resolve, reject){

        if(name === undefined){
            name = path.basename(filename);
        }else{
            name = encodeURIComponent(name);
        }

        try{
            var options = {
                url : getClusterPostServer() + "/dataprovider/" + jobid + "/" + name,
                method: "PUT",
                agentOptions: clusterpost.agentOptions,
                headers: { 
                    "Content-Type": "application/octet-stream"
                },
                auth: clusterpost.auth
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

var uploadFiles = function(jobid, filenames, names){
    return Promise.map(filenames, function(filename, index){
        if(names !== undefined){
            return uploadFile(jobid, filename, names[index]);
        }
        return uploadFile(jobid, filename);
    }, {concurrency: 1})
    .then(function(allupload){
        return allupload;
    });
}

var executeJob = function(jobid, force){
    Joi.assert(jobid, Joi.string().alphanum())
    return new Promise(function(resolve, reject){
        try{
            var options = {
                url : getClusterPostServer() + "/executionserver/" + jobid,
                json: {
                    force: force
                },
                method: "POST",
                agentOptions: clusterpost.agentOptions,
                auth: clusterpost.auth
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

var updateJobStatus = function(jobid){
    Joi.assert(jobid, Joi.string().alphanum())
    return new Promise(function(resolve, reject){
        try{
            var options = {
                url : getClusterPostServer() + "/executionserver/" + jobid,
                method: "GET",
                agentOptions: clusterpost.agentOptions,
                auth: clusterpost.auth
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

var killJob = function(jobid){
    Joi.assert(jobid, Joi.string().alphanum())
    return new Promise(function(resolve, reject){
        var options = {
            url : getClusterPostServer() + "/executionserver/" + jobid,
            method: "DELETE",
            agentOptions: clusterpost.agentOptions,
            auth: clusterpost.auth
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

var deleteJob = function(jobid){
    Joi.assert(jobid, Joi.string().alphanum())
    return new Promise(function(resolve, reject){
        var options = {
            url : getClusterPostServer() + "/dataprovider/" + jobid,
            method: "DELETE",
            agentOptions: clusterpost.agentOptions,
            auth: clusterpost.auth
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

var checkFiles = function(files){
    return Promise.map(files, function(filename){
        var stat = fs.statSync(filename);
        if(stat){
            return true;
        }
    });
}

var createAndSubmitJob = function(job, files, names){
    var jobid;    
    var prom;
    if(files){
        prom = checkFiles(files)
        .then(function(){
            return createDocument(job);
        })
        .then(function(res){
            jobid = res.id;
            return uploadFiles(jobid, files, names);
        });
    }else{
        prom = createDocument(job)
        .then(function(res){
            jobid = res.id;
        });
    }
    return prom
    .then(function(res){
        return executeJob(jobid);
    })
    .then(function(res){
        return jobid;
    });
}

var mkdirp = function(outputdir){

    var pathparse = path.parse(outputdir);
    var allpatharray = outputdir.split(path.sep);
    currentpath = pathparse.root;
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

var getJobOutputs = function(job, outputdir){
    
    var outputs = job.outputs;
    
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
            return getDocumentAttachmentSave(job._id, name, filename);
        }else{
            return getDocumentAttachment(job._id, name);
        }
    });
}


exports.setClusterPostServer = setClusterPostServer;
exports.getClusterPostServer = getClusterPostServer;
exports.setAgentOptions = setAgentOptions;
exports.createUser  =   createUser;
exports.userLogin   =   userLogin;
exports.getUsernamePassword = getUsernamePassword;
exports.promptUsernamePassword = promptUsernamePassword;
exports.getUserToken = getUserToken
exports.setUserToken = setUserToken
exports.getUser =   getUser;
exports.getUsers    =   getUsers;
exports.updateUser  =   updateUser;
exports.deleteUser  =   deleteUser;
exports.deleteUsers  =   deleteUsers;
exports.getExecutionServers =   getExecutionServers;
exports.createDocument  =   createDocument;
exports.getDocument =   getDocument;
exports.updateDocument =   updateDocument;
exports.getDocumentAttachment   =   getDocumentAttachment;
exports.getDocumentAttachmentSave = getDocumentAttachmentSave;
exports.getJobs = getJobs;
exports.getJobOutputs = getJobOutputs;
exports.getDownloadToken    =   getDownloadToken;
exports.downloadAttachment  =   downloadAttachment;
exports.uploadFile  =   uploadFile;
exports.uploadFiles =   uploadFiles;
exports.executeJob  =   executeJob;
exports.updateJobStatus =   updateJobStatus;
exports.killJob =   killJob;
exports.deleteJob   =   deleteJob;
exports.createAndSubmitJob  =   createAndSubmitJob;
exports.start = start;
