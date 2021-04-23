const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

var cwd = process.cwd();
var defaultconfig = path.join(__dirname, "conf.json.in");

var user_conf_dir = "~/.clusterpost-execution"
var user_conf = path.join(user_conf_dir, 'conf.json');


try{
	if(!fs.existsSync(user_conf_dir)){
		fs.mkdirSync(user_conf_dir);
	}
	var stats = fs.statSync(user_conf);
	console.log(chalk.green("Your configuration file is at"), chalk.green(user_conf));
}catch(e){
	console.log(chalk.green("Generating default configuration file at"), chalk.green(user_conf));
	console.log(chalk.green("Please edit this file with your configuration parameters."));
	console.log(chalk.green("The token.json should be saved into this directory as well."));
	fs.writeFileSync(user_conf, fs.readFileSync(defaultconfig));
}
