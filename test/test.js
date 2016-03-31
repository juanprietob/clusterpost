
var request = require('request');
var fs = require('fs');
var Promise = require('bluebird');
var path = require('path');


const Code = require('code');   // assertion library
const Joi = require('joi');
const Lab = require('lab');
const lab = exports.lab = Lab.script();


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
                "type": "STDOUT",
                "name": "*.out"
            },
            {
                "type": "STDERR",
                "name": "*.err"
            }
        ],
        "type": "job",
        "userEmail": "juanprietob@gmail.com",
        "executionserver" : "testserver"
    };

var jobid;

lab.experiment("Test clusterpost", function(){
    lab.test('returns true when document is created', function(){

        return createDocument(job)
        .then(function(res){            
            jobid = res.id;
            console.info("JOBID:", jobid);
            Code.expect(res.ok).to.equal(true);
        });
    });

    lab.test('returns true when document is fetched', function(){
        
        return getDocument(jobid)
        .then(function(jobdb){            
            Code.expect(jobdb.jobstatus).to.deep.equal({
                status: "CREATE"
            });
            delete jobdb.jobstatus;
            Code.expect(jobdb.timestamp).to.be.a.string();
            delete jobdb.timestamp;
            delete jobdb._id;
            delete jobdb._rev;
            Code.expect(job).to.deep.equal(jobdb);
        });        
    });

    lab.test('returns true when attachment is added', function(){
        
        return Promise.map(inputs, function(filename){
            return uploadfile(jobid, filename);
        }, {concurrency: 1})
        .then(function(allupload){
            for(var i = 0; i < allupload.length; i++){
                Code.expect(allupload[i].ok).to.equal(true);
            }
        });
    });


    lab.test('returns true when job is executed', function(){

        var joijobstatus = Joi.object().keys({
            jobid: Joi.number(),
            status: Joi.string().valid('RUN'),
            downloadstatus: Joi.array().items(Joi.object().keys({
                path: Joi.string(),
                status: Joi.boolean().valid(true)
            }))

        })
        
        return executeJob(jobid)
        .then(function(jobstatus){
            Joi.assert(jobstatus, joijobstatus);            
        });
    });

    lab.test('returns true when job is executed', function(){

        var joijobstatus = Joi.object().keys({
            jobid: Joi.number(),
            status: Joi.string().valid('RUN'),
            downloadstatus: Joi.array().items(Joi.object().keys({
                path: Joi.string(),
                status: Joi.boolean().valid(true)
            }))

        })
        
        return executeJob(jobid)
        .then(function(jobstatus){
            Joi.assert(jobstatus, joijobstatus);            
        });
    });

    lab.test('returns true when jobstatus is updated', function(){

        var joijobstatus = Joi.object().keys({
            jobid: Joi.number(),
            status: Joi.string().valid('RUN'),
            downloadstatus: Joi.array().items(Joi.object().keys({
                path: Joi.string(),
                status: Joi.boolean().valid(true)
            }))

        })
        
        return updateJobStatus(jobid)
        .then(function(jobstatus){
            console.log(jobstatus);
        });
    });
});