var clusterpost = require("clusterpost-lib");
var path = require('path');
var Promise = require('bluebird');
var argv = require('minimist')(process.argv.slice(2));
const os = require('os');
const fs = require('fs');
const prompt = require('prompt');


var agentoptions = {
    rejectUnauthorized: false
}

clusterpost.setAgentOptions(agentoptions);


const getConfigFile = function () {
    return new Promise(function(resolve, reject){
        try {
            // Try to load the user's personal configuration file
            var conf = path.join(os.homedir(), '.clusterpost.json');
            resolve(require(conf));
        } catch (e) {            
            reject(e);
        }
    });
};

const help = function(){
    console.error("Help: Download tasks from the server.");
    console.error("Required parameters when login for first time:");
    console.error("--server url, set the server url. ex., https://some.server:8180");    
    console.error("\nOptional parameters:");
    console.error("--dir  Output directory, default: ./out");
    console.error("--status one of [DONE, RUN, FAIL, EXIT, UPLOADING, CREATE], default: None");
    console.error("--print , if provided the information is printed only");
    console.error("--delete, default false, when downloading jobs with status 'DONE', the jobs will be deleted upon completion");
    console.error("--j job id, default: all ids");
    console.error("--executable executable, default: all executables");
    console.error("--email email, default: (authenticated user)");
}

if(argv["h"] || argv["help"]){
    help();
    process.exit(1);
}

var writeConfFile = function(conf){
    var confpath = path.join(os.homedir(), '.clusterpost.json');
    console.log("Writting configuration file with server information and token to:", confpath);
    console.log("You won't need to type the server information next time.");
    console.log("If you have authentication problems in the future, please delete this file and type the login information again.");

    fs.writeFileSync(confpath, JSON.stringify(conf));
}

var login = function(user){
    return clusterpost.userLogin(user);
}

var getUsernamePassword = function(){
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
            resolve(result);
        });
    });
}

var loginprom = undefined;
if(argv["server"]){

    var conf = {};
    conf.server = argv["server"];

    clusterpost.setClusterPostServer(conf.server);

    loginprom = 
    getUsernamePassword()
    .then(function(user){
        return login(user);
    })
    .then(function(res){
        conf.token = res.token;
        writeConfFile(conf);
    });
}else{
    loginprom = getConfigFile()
    .then(function(conf){
        clusterpost.setClusterPostServer(conf.server);
        clusterpost.setUserToken(conf.token);
    })
    .catch(function(e){
        throw "Config file not found. Use -h or --help to learn how to use this program";
    });
}

var deletejobs = false;
if(argv["delete"] !== undefined){
    console.log("After successful download, jobs with status DONE will be deleted!");
    deletejobs = true;
}

var userEmail = undefined;
if(argv["email"]){
    userEmail = argv["email"];
}

var outputdir = "./out";
if(argv["dir"]){
    outputdir = argv["dir"];
}

var status = argv["status"];
var jobid = argv["j"];
var executable = argv["executable"];
var print = argv["print"];

console.log("Output dir", outputdir);
console.log("Status", status);
if(jobid){
    console.log("jobid", jobid);
}

if(executable){
    console.log("executable", executable);   
}

if(print){
    console.log("print", print);   
}


loginprom
.then(function(){

    if(!print){
        if(!jobid){
            return clusterpost.getJobs(executable, status, userEmail)
            .then(function(jobs){                
                return Promise.map(jobs, function(job){
                    console.log(JSON.stringify(job, null, 2));
                    if(job.outputdir){                        
                        return clusterpost.getJobOutputs(job, job.outputdir)
                        .then(function(){
                            if(job.name){
                                console.log(job.name, "downloaded...");
                            }else{
                                console.log(job._id, "downloaded...");
                            }
                            
                            if(deletejobs){
                                console.log("Deleting job");
                                return clusterpost.deleteJob(job._id);
                            }
                        });
                    }else{
                        var joboutputdir = undefined;
                        if(job.name){
                            joboutputdir = path.join(outputdir, job.name);
                        }else{
                            joboutputdir = path.join(outputdir, job._id);
                        }
                        
                        return clusterpost.getJobOutputs(job, joboutputdir)
                        .then(function(){
                            if(job.name){
                                console.log(job.name, "downloaded...");
                            }else{
                                console.log(job._id, "downloaded...");
                            }
                            if(deletejobs){
                                console.log("Deleting job");
                                return clusterpost.deleteJob(job._id);
                            }
                        });
                    }
                },
                {
                    concurrency: 1
                });
            });
        }else{
            return clusterpost.getDocument(jobid)
            .then(function(job){
                if(job.outputdir){
                    return clusterpost.getJobOutputs(job, job.outputdir);
                }else{
                    var joboutputdir = undefined;
                    if(job.name){
                        joboutputdir = path.join(outputdir, job.name);
                    }else{
                        joboutputdir = path.join(outputdir, job._id);
                    }
                    return clusterpost.getJobOutputs(job, joboutputdir);
                }
            })
            .then(function(){
                console.log("job downloaded...");
                if(deletejobs){
                    console.log("Deleting job");
                    return clusterpost.deleteJob(jobid);
                }
            });
        }
    }else{
        if(!jobid){
            return clusterpost.getJobs(executable, status, userEmail)
            .then(function(jobs){
                console.log(JSON.stringify(jobs, null, 2))
            });
        }else{
            return clusterpost.getDocument(jobid)
            .then(function(job){
                console.log(JSON.stringify(job, null, 2))
            });
        }
    }
    
})
.catch(console.error)
