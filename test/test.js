
var request = require('request');
var fs = require('fs');
var Promise = require('bluebird');
var path = require('path');

const Joi = require('joi');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const clustermodel = require("clusterpost-model");

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

var agentOptions = {};

if(conf.tls && conf.tls.cert){
    agentOptions.ca = fs.readFileSync(conf.tls.cert);
}

var getClusterPostServer = function(){
    return conf.uri 
}

var inputs = [
	"./data/gravitational-waves-simulation.jpg"
];
var jobid;
var token;
var tokenraw;

var createUser = function(user){
    return new Promise(function(resolve, reject){
        var options = {
            url: getClusterPostServer() + "/auth/user",
            method: 'POST',
            json: user,
            agentOptions: agentOptions
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
            agentOptions: agentOptions
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

var getUser = function(){
    return new Promise(function(resolve, reject){
        var options = {
            url: getClusterPostServer() + "/auth/user",
            method: 'GET',
            headers: { authorization: token }
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

var deleteUser = function(token){
    return new Promise(function(resolve, reject){
        var options = {
            url: getClusterPostServer() + "/auth/user",
            method: 'DELETE',
            agentOptions: agentOptions,
            headers: { authorization: token }
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
            agentOptions: agentOptions,
            headers: { authorization: token }
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
            agentOptions: agentOptions,
            headers: { authorization: token }
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

var getDocument = function(id){

    return new Promise(function(resolve, reject){
        var options = {
            url : getClusterPostServer() + "/dataprovider/" + id,
            method: "GET",
            agentOptions: agentOptions,
            headers: { authorization: token }
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

    return new Promise(function(resolve, reject){
        var options = {
            url : getClusterPostServer() + "/dataprovider/" + id + "/" + name,
            method: "GET",
            agentOptions: agentOptions,
            headers: { authorization: token }
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

var getDownloadToken = function(id, name){

    return new Promise(function(resolve, reject){
        var options = {
            url : getClusterPostServer() + "/dataprovider/download/" + id + "/" + name,
            method: "GET",
            agentOptions: agentOptions,
            headers: { authorization: token }
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

    return new Promise(function(resolve, reject){
        var options = {
            url : getClusterPostServer() + "/dataprovider/download/" + token,
            method: "GET",
            agentOptions: agentOptions
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

var uploadfile = function(jobid, filename){

	return new Promise(function(resolve, reject){

        try{
            var options = {
                url : getClusterPostServer() + "/dataprovider/" + jobid + "/" + path.basename(filename),
                method: "PUT",
                headers:{
                    "Content-Type": "application/octet-stream"
                },
                agentOptions: agentOptions,
                headers: { authorization: token }
            }

            var stream = fs.createReadStream(filename);

            stream.pipe(request(options, function(err, res, body){
                    if(err){
                        reject(err);
                    }else{
                        resolve(JSON.parse(body));
                    }
                })
            );
        }catch(e){
            reject(e);
        }

	});
}

var executeJob = function(jobid, force){
    return new Promise(function(resolve, reject){
        try{
            var options = {
                url : getClusterPostServer() + "/executionserver/" + jobid,
                json: {
                    force: force
                },
                method: "POST",
                agentOptions: agentOptions,
                headers: { authorization: token }
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
    return new Promise(function(resolve, reject){
        try{
            var options = {
                url : getClusterPostServer() + "/executionserver/" + jobid,
                method: "GET",
                agentOptions: agentOptions,
                headers: { authorization: token }
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

var updateJobStatusRec = function(jobid){
    var clustermodelstatus = Joi.object().keys({
        jobid: Joi.number(),
        status: Joi.string().valid('DONE'),
        downloadstatus: Joi.array().items(Joi.object().keys({
            path: Joi.string(),
            status: Joi.boolean().valid(true)
        })), 
        uploadstatus: Joi.array().items(Joi.object())
    });

    return new Promise(function(resolve, reject){
        setTimeout(resolve, 5000);
    })
    .then(function(){
        return updateJobStatus(jobid)
        .then(function(jobstatus){
            Joi.assert(jobstatus, clustermodelstatus);
            return jobstatus;
        })
        .catch(function(e){
            return updateJobStatusRec(jobid);
        });
    })
}

var killJob = function(jobid){
    return new Promise(function(resolve, reject){
        var options = {
            url : getClusterPostServer() + "/executionserver/" + jobid,
            method: "DELETE",
            agentOptions: agentOptions,
            headers: { authorization: token }
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
    return new Promise(function(resolve, reject){
        var options = {
            url : getClusterPostServer() + "/dataprovider/" + jobid,
            method: "DELETE",
            agentOptions: agentOptions,
            headers: { authorization: token }
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

var user = {
    email: "algiedi85@gmail.com",
    name: "Alpha Capricorni",
    password: "Some808Password!"
}

var joiokres = Joi.object().keys({
                ok: Joi.boolean().valid(true),
                id: Joi.string(),
                rev: Joi.string()
            });


var job2 = {
        "executable": "python",
        "parameters": [
            {
                "flag": "-c",
                "name": "while True: print '.'"
            }
        ],
        "outputs": [
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

lab.experiment("Test clusterpost", function(){
    

    lab.test('returns true when new user is created.', function(){

        return createUser(user)
        .then(function(res){
            Joi.assert(res.token, Joi.string().required());
        });
        
    });

    lab.test('returns true when user is logged in.', function(){

        var user = {
            email: "algiedi85@gmail.com",
            password: "Some808Password!"
        }

        return userLogin(user)
        .then(function(res){
            Joi.assert(res.token, Joi.string().required())
            tokenraw = res.token;
            token = "Bearer " + res.token;
        });
        
    });

    lab.test('returns true when executionservers are fetched due to insufficient scope, the scope "clusterpost" is also added', function(){

        return getExecutionServers()
        .then(function(res){
            Joi.assert(res.statusCode, 403);

            return getUser()
            .then(function(res){
                return new Promise(function(resolve, reject){

                    var user = JSON.parse(res);
                    user.scope.push('clusterpost');

                    var options = { 
                        uri: "http://localhost:5984/clusterjobs/_bulk_docs",
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


    lab.test('returns true when executionservers are fetched with valid scope', function(){

        return getExecutionServers()
        .then(function(res){
            job.executionserver = res[0].name;
            job2.executionserver = res[0].name;
        });
    });


    lab.test('returns true when document is created', function(){

        return createDocument(job)
        .then(function(res){            
            Joi.assert(res, joiokres);
            jobid = res.id;
            console.info("JOBID:", jobid);
        });
    });

    lab.test('returns true when document is fetched', function(){
        
        return getDocument(jobid)
        .then(function(job){
            Joi.assert(job, clustermodel.job);
            Joi.assert(job.jobstatus, Joi.object().keys({
                status: Joi.string().valid("CREATE")
            }))
        });        
    });

    lab.test('returns true when attachment is added', function(){
        
        return Promise.map(inputs, function(filename){
            return uploadfile(jobid, filename);
        }, {concurrency: 1})
        .then(function(allupload){
            var joiupload = Joi.array().items(joiokres).min(1);
            Joi.assert(allupload, joiupload);
        });
    });


    lab.test('returns true when job is executed', function(){
        return executeJob(jobid)
        .then(function(jobstatus){
            Joi.assert(jobstatus, clustermodel.jobstatus);
        });
    });

    lab.test('returns true when jobstatus is updated', function(){
        return updateJobStatus(jobid)
        .then(function(jobstatus){
            Joi.assert(jobstatus, clustermodel.jobstatus);
        });
    });

    lab.test('returns true until jobstatus is DONE', function(){
        
        return updateJobStatusRec(jobid)
        .then(function(jobstatus){
            Joi.assert(jobstatus.status, Joi.string().valid("DONE"));
        });
    });

    lab.test('returns true when job is executed again with force', function(){
        return executeJob(jobid, true)
        .then(function(jobstatus){
            Joi.assert(jobstatus, clustermodel.jobstatus);
        });
    });

    lab.test('returns true if get attachment output stream is valid', function(done){
        getDocumentAttachment(jobid, "stdout.out")
        .then(function(stdout){
            var value = "774035995 70572 gravitational-waves-simulation.jpg";
            if(stdout.indexOf(value) === -1){
                done("Output validation not found: " + value);
            }
            done();
        });
    });

    lab.test('returns true if get attachment output stream is valid using a download token', function(done){
        getDownloadToken(jobid, "stdout.out")
        .then(function(res){
            Joi.assert(res.token, Joi.string());
            return downloadAttachment(res.token);
        })
        .then(function(stdout){
            var value = "774035995 70572 gravitational-waves-simulation.jpg";
            if(stdout.indexOf(value) === -1){
                done("Output validation not found: " + value);
            }
            done();
        });
    });

    lab.test('returns true if the document is deleted', function(){
        return deleteJob(jobid)
        .then(function(res){
            Joi.assert(res, joiokres);
        });
    });

    lab.test('returns true when second job is created', function(){

        return createDocument(job2)
        .then(function(res){            
            Joi.assert(res, joiokres);
            jobid = res.id;
            console.info("JOBID:", jobid);
        });
    });

    lab.test('returns true when second job is executed', function(){
        return executeJob(jobid)
        .then(function(jobstatus){
            Joi.assert(jobstatus, clustermodel.jobstatus);
        });
    });

    lab.test('returns true when second job is killed', function(){
        return killJob(jobid)
        .then(function(jobstatus){

            Joi.assert(jobstatus, clustermodel.jobstatus);
            Joi.assert(jobstatus.status, Joi.string().valid("KILL"));
        });
    });

    lab.test('returns true when second job is deleted', function(){
        return deleteJob(jobid)
        .then(function(res){
            Joi.assert(res, joiokres);
        });
    });

    lab.test('returns true when valid user deletes itself.', function(){

        return deleteUser(token)
        .then(function(res){
            Joi.assert(res, Joi.object().keys({ 
                ok: Joi.boolean(),
                id: Joi.string(),
                rev: Joi.string()
            }));
        });
    });
});