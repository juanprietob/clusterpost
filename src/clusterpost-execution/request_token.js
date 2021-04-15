'use strict'

const clusterpost = require("clusterpost-lib");
const clustermodel = require("clusterpost-model");
const Joi = require('joi');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs');

var agentoptions = {
    rejectUnauthorized: false
}

clusterpost.setAgentOptions(agentoptions);

var help = function(){
    console.log(chalk.cyan("help: Request token from server"));
    console.log(chalk.green("Options:"));
    console.log(chalk.green("--es               <execution server name>"));
}


var executionserver = argv["es"];

if(!executionserver || argv["h"] || argv["help"]){
    help();
    process.exit();
}

clusterpost.start()
.then(function(){
	return clusterpost.getExecutionServerToken({executionserver})
	.then(function(token){
		token = token[0]
		Joi.assert(token, clustermodel.executionservertoken);
		console.log("Writing token to token.json");
		fs.writeFileSync('token.json', JSON.stringify(token));
	})
})
.catch(console.error)