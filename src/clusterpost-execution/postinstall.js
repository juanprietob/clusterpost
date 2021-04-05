const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

var cwd = process.cwd();
var defaultconfig = path.join(__dirname, "conf.json.in");
var userconf = path.join(cwd, 'conf.json');

try{
	var stats = fs.statSync(userconf);
	console.log(chalk.green("Your configuration file is at"), chalk.green(userconf));
}catch(e){
	console.log(chalk.green("Generating default configuration file at"), chalk.green(userconf));
	console.log(chalk.green("Please edit this file with your configuration parameters."));
	console.log(chalk.green("The token.json should be saved into this directory as well."));
	fs.writeFileSync(userconf, fs.readFileSync(defaultconfig));
}
