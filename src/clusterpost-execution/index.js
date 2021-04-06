#!/usr/bin/env node

const _ = require('underscore');
const argv = require('minimist')(process.argv.slice(2));
const path = require('path');
const fs = require('fs');
const Promise = require('bluebird');
const chalk = require('chalk')

var submit = argv["submit"];
var jobid = argv["j"];
var force = argv["f"];

var status = argv["status"];

var kill = argv["kill"];

var jobdelete = argv["delete"];

var remote = argv["remote"];

var help = function(){
    console.log(chalk.cyan("help: To execute the program you must specify the job id. "));
    console.log(chalk.green("Options:"));
    console.log(chalk.green("--j                <job id>"));
    console.log(chalk.green("--submit           Submit the job."));
    console.log(chalk.green("-f                 force job submission"));
    console.log(chalk.green("--status  	        get job status"));
    console.log(chalk.green("--kill             kill job"));
    console.log(chalk.green("--delete  	        delete job"));
    console.log(chalk.green("--remote           run as a daemon"));
    console.log(chalk.red("Run only mode (no updates to document are made), set uri and token:"));
    console.log(chalk.green("--uri              server uri"));
    console.log(chalk.green("--token            token for authentication"));
}

if(!remote && (!jobid || !submit && !status && !kill && !jobdelete) && !(argv["uri"] && argv["token"]) || argv["h"] || argv["help"]){
    help();
    process.exit();
}

const getConfigFile = function (base_directory) {
  try {
    // Try to load the user's personal configuration file
    return require(path.join(base_directory, 'conf.my.json'));
  } catch (e) {
    // Else, read the default configuration file
    return require(path.join(base_directory, 'conf.json'));
  }
};

if(argv["uri"] && argv["token"]){
    var conf = {
        uri: argv["uri"],
        token: argv["token"],
        engine: "engine_unix",
        storagedir: "./",
        run_only: true
    }
}else{
    var confpath = __dirname;
    if(module.parent && module.parent.filename){
        confpath = path.dirname(module.parent.filename);
    }

    var conf = getConfigFile(confpath);    
}


try{
    if(!conf.token){
        var tokenfile = path.join(confpath, ".token");
        try{
            fs.statSync(tokenfile);
        }catch(e){
            tokenfile = path.join(confpath, "token.json");
        }
        
        if(conf.tokenfile){
            tokenfile = conf.tokenfile;
        }
        _.extend(conf, JSON.parse(fs.readFileSync(tokenfile)));
    }
    
}catch(e){
    console.error(chalk.red(e));
    process.exit(1);
}

var executionmethods = require(path.join(__dirname, 'executionserver.methods'))(conf);
var clusterengine = require(path.join(__dirname, conf.engine))(conf);


if(remote){

    var crontab = require('node-crontab');
    var isrunningtask = false;

    crontab.scheduleJob("*/1 * * * *", function(){
        if(!isrunningtask){
            isrunningtask = true;        
            Promise.all([executionmethods.getJobsQueue(), executionmethods.getJobsRun()])
            .spread(function(jobs, jobs_run){
                if(conf.maxjobs){
                    maxJobsAllowed = conf.maxjobs - jobs_run.length;
                    if(maxJobsAllowed > 0){
                        jobs = jobs.slice(0, maxJobsAllowed);
                    }else{
                        jobs = [];    
                    }
                }
                console.log("jobsubmit", jobs);
                return Promise.map(jobs, function(doc){
                    return require(path.join(__dirname, "jobsubmit"))(doc, null, conf);
                }, 
                {
                    concurrency: 1
                });
            })
            .then(function(res){
                console.log(res)
                return Promise.all([executionmethods.getJobsUploading(), executionmethods.getJobsRun()])
            })
            .then(function(jobs){            
                jobs = _.flatten(jobs);
                console.log("jobstatus", jobs);
                return Promise.map(jobs, function(doc){
                    return require(path.join(__dirname, "jobstatus"))(doc, conf);
                },
                {
                    concurrency: 1
                });
            })
            .then(function(){
                return executionmethods.getJobsKill()
            })
            .then(function(jobs){
                console.log("jobkill", jobs);
                return Promise.map(jobs, function(doc){                
                    return require(path.join(__dirname, "jobkill"))(doc, conf);
                },
                {
                    concurrency: 1
                });
            })
            .then(function(){
                return executionmethods.getJobsDelete();
            })
            .then(function(jobs){
                jobs = _.flatten(jobs);
                console.log("jobdelete", jobs);
                return Promise.map(jobs, function(doc){
                    return require(path.join(__dirname, "jobdelete"))(doc._id, conf, doc);
                },
                {
                    concurrency: 1
                });
            })
            .then(function(){
                isrunningtask = false;
            })
            .catch(function(error){
                console.error(error);
                process.exit(1);
            });
        }
        
    });

    console.log(chalk.green("Starting clusterpost-execution in remote mode:"));

}else{

    if(jobdelete){            
        require(path.join(__dirname, "jobdelete"))(jobid, conf);
    }else{
        executionmethods.getDocument(jobid)
        .then(function(doc){ 

            if(submit){
                return require(path.join(__dirname, "jobsubmit"))(doc, force, conf, );
            }else if(status){
                return require(path.join(__dirname, "jobstatus"))(doc, conf);
            }else if(kill){
                return require(path.join(__dirname, "jobkill"))(doc, conf);
            }
            
        })
        .then(function(){
            process.exit();
        })
        .catch(function(error){
            console.error(error);
            process.exit(1);
        });
    }

    
}
