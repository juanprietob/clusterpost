
var request = require('request');
var fs = require('fs');
var Promise = require('bluebird');
var path = require('path');

const Joi = require('joi');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const joijob = require("./joi.job")();


var inputs = [
	"./data/gravitational-waves-simulation.jpg"
];



var createDocument = function(job){

    return new Promise(function(resolve, reject){
        var options = {
            url : "http://localhost:8180/dataprovider",
            method: "POST",
            json: job
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
            url : "http://localhost:8180/dataprovider/" + id,
            method: "GET"
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
            url : "http://localhost:8180/dataprovider/" + id + "/" + name,
            method: "GET"
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
                url : "http://localhost:8180/dataprovider/" + jobid + "/" + path.basename(filename),
                method: "PUT",
                headers:{
                    "Content-Type": "application/octet-stream"
                }
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

var executeJob = function(jobid){
    return new Promise(function(resolve, reject){
        try{
            var options = {
                url : "http://localhost:8180/executionserver/" + jobid,
                method: "POST"
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

var updateJobStatus = function(jobid){
    return new Promise(function(resolve, reject){
        try{
            var options = {
                url : "http://localhost:8180/executionserver/" + jobid,
                method: "GET"
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
    var joijobstatus = Joi.object().keys({
        jobid: Joi.number(),
        status: Joi.string().valid('DONE'),
        downloadstatus: Joi.array().items(Joi.object().keys({
            path: Joi.string(),
            status: Joi.boolean().valid(true)
        })), 
        uploadstatus: Joi.array().items(joiokres)
    });

    return updateJobStatus(jobid)
    .then(function(jobstatus){
        Joi.assert(jobstatus, joijobstatus);
        return jobstatus;
    })
    .catch(function(e){
        return updateJobStatusRec(jobid);
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
                "type": "file",
                "name": "stdout.out"
            },
            {
                "type": "file",
                "name": "stderr.err"
            }
        ],
        "type": "job",
        "userEmail": "juanprietob@gmail.com",
        "executionserver" : "testserver"
    };

var jobid;

var joiokres = Joi.object().keys({
                ok: Joi.boolean().valid(true),
                id: Joi.string(),
                rev: Joi.string()
            });

lab.experiment("Test clusterpost", function(){
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
            Joi.assert(job, joijob.job);
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
            Joi.assert(jobstatus, joijob.jobstatus);
        });
    });

    lab.test('returns true when jobstatus is updated', function(){
        return updateJobStatus(jobid)
        .then(function(jobstatus){
            Joi.assert(jobstatus, joijob.jobstatus);
        });
    });

    lab.test('returns true until jobstatus is DONE', function(){
        
        return updateJobStatusRec(jobid)
        .then(function(jobstatus){
            Joi.assert(jobstatus, joijob.jobstatus);
        });
    });

    lab.test('returns true if get attachment output stream is valid', function(){
        return getDocumentAttachment(jobid, "stdout.out")
        .then(function(stdout){
            var value = "774035995 70572 gravitational-waves-simulation.jpg\n";
            Joi.assert(stdout, Joi.string().valid(value));
        });
    });
});