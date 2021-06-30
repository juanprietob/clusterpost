#!/usr/bin/env node

const _ = require('underscore');
const argv = require('minimist')(process.argv.slice(2));
const path = require('path');
const fs = require('fs');
const Promise = require('bluebird');
const chalk = require('chalk')
const os = require('os');

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

const getConfigFile = function () {
    var confpath = __dirname
    var conf_file = path.join(confpath, "conf.json")

    if(fs.existsSync(conf_file)){
        console.log(chalk.green("Using configuration file at:", conf_file));
        return require(conf_file)
    }

    confpath = path.join(os.homedir(), '.clusterpost-execution');
    conf_file = path.join(confpath, "conf.json")
    if(fs.existsSync(conf_file)){
        console.log(chalk.green("Using configuration file at:", conf_file));
        return require(conf_file)
    }else{
        console.error(chalk.red("No configuration conf.json file found!"))
        console.error(chalk.red("The configuration file should be created at directory", __dirname, "or ~/.clusterpost-execution"))
        process.exit(1);
    }
}

if(argv["uri"] && argv["token"]){
    var conf = {
        uri: argv["uri"],
        token: argv["token"],
        engine: "engine_unix",
        storagedir: "./",
        run_only: true,
        detached: false
    }
}else{
    var conf = getConfigFile();
}


try{
    if(!conf.token){
        var tokenfile = path.join(os.homedir(), '.clusterpost-execution/token.json');
        if(fs.existsSync(tokenfile)){
            _.extend(conf, JSON.parse(fs.readFileSync(tokenfile)));
        }else{
            tokenfile = path.join(__dirname, "token.json")
            _.extend(conf, JSON.parse(fs.readFileSync(tokenfile)));
        }
    }
    
}catch(e){
    console.error(chalk.red(e));
    console.error(chalk.red("No authentication token found"));
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
            Promise.all([executionmethods.getJobsQueue(), executionmethods.getJobsRun(), executionmethods.getSoftware()])
            .spread(function(jobs, jobs_run, softwares){

                var j = executionmethods.splitJobsGPU(jobs, softwares);
                var jobs = j.jobs;
                var jobs_gpu = j.jobs_gpu
                console.log("Length of gpu jobs on queue: " jobs_gpu)

                var j = executionmethods.splitJobsGPU(jobs_run, softwares);
                var jobs_run = j.jobs;
                var jobs_run_gpu = j.jobs_gpu
                console.log("Length of gpu jobs running: " + jobs_run_gpu)

                if(conf.maxjobs){
                    var maxJobsAllowed = conf.maxjobs - jobs_run.length;
                    if(maxJobsAllowed > 0){
                        jobs = jobs.slice(0, maxJobsAllowed);
                    }else{
                        jobs = [];    
                    }
                }
                if(conf.maxjobsgpu){
                    var maxJobsGPUAllowed = conf.maxjobsgpu - jobs_run_gpu.length;
                    if(maxJobsGPUAllowed > 0){
                        jobs_gpu = jobs_gpu.slice(0, maxJobsGPUAllowed);
                    }else{
                        jobs_gpu = [];
                    }
                }
                console.log("jobsubmit", jobs);
                return Promise.map(jobs, function(doc){
                    return require(path.join(__dirname, "jobsubmit"))(doc, null, conf);
                }, 
                {
                    concurrency: 1
                })
                .then((res)=>{
                    console.log(res)
                    console.log("jobsubmit_gpu", jobs_gpu);
                    return Promise.map(jobs_gpu, function(doc){
                        return require(path.join(__dirname, "jobsubmit"))(doc, null, conf);
                    },
                    {
                        concurrency: 1
                    });
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
        .then(function(res){
            console.log(res);
            process.exit();
        })
        .catch(function(error){
            console.error(error);
            process.exit(1);
        });
    }

    
}
