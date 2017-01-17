var clusterpost = require("clusterpost-lib");
var path = require('path');
var Promise = require('bluebird');
var argv = require('minimist')(process.argv.slice(2));
const os = require('os');
const fs = require('fs');


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
            console.log(e)
            reject(e);
        }
    });
};

const help = function(){
    console.error("Help: Download tasks from the server.");
    console.error("Required parameters when login for first time:");
    console.error("--server url, set the server url. ex., https://some.server:8180");
    console.error("-u username");
    console.error("-p password");
    console.error("\nOptional parameters:");
    console.error("--dir  Output directory, default: ./out");
    console.error("--status one of [DONE, RUN, FAIL, EXIT, UPLOADING, CREATE], if this flag is provided, the job information will only be printed. By default, the behavior is status 'DONE' and download the results.");
    console.error("--delete, default false, when downloading jobs with status 'DONE', the jobs will be deleted upon completion");
    console.error("--j job id, default: all ids");
    console.error("--executable executable, default: all executables");
}

if(argv["h"] || argv["help"]){
    help();
    process.exit(1);
}

var writeConfFile = function(conf){
    var confpath = path.join(os.homedir(), '.clusterpost.json');
    console.log("Writting configuration file with server information and token to:", confpath);
    console.log("You won't need to type the login information next time.");
    console.log("If you have authentication problems in the future, please delete this file and type the login information again.");

    fs.writeFileSync(confpath, JSON.stringify(conf));
}

var login = function(user){
    return clusterpost.userLogin(user);
}

var loginprom = undefined;
if(argv["server"] && argv["u"] && argv["p"]){

    var conf = {};
    conf.server = argv["server"];

    clusterpost.setClusterPostServer(conf.server);

    var user = {};
    user.email = argv["u"];
    user.password = argv["p"];

    loginprom = login(user)
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

var userEmai = undefined;
if(argv["email"]){
    userEmai = argv["email"];
}

loginprom
.then(function(){

    var outputdir = "./out";
    if(argv["dir"]){
        outputdir = argv["dir"];
    }

    console.log("Using download directory:", outputdir);


    var status = argv["status"];
    var jobid = argv["j"];
    var executable;

    if(!status){
        if(!jobid){
            return clusterpost.getJobs(executable, "DONE", userEmai)
            .then(function(jobs){
                console.log(jobs);
                return Promise.map(jobs, function(job){
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
                        return clusterpost.getJobOutputs(job, path.join(outputdir, job._id))
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
                    return clusterpost.getJobOutputs(job, path.join(job.outputdir, jobid));
                }else{
                    return clusterpost.getJobOutputs(job, path.join(outputdir, jobid));
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
            return clusterpost.getJobs(executable, status, userEmai)
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
