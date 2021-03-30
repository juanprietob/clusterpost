var fs = require('fs');
var path = require('path');

var cwd = process.cwd();
var defaultconfig = path.join(__dirname, "conf.json.in");
var userconf = path.join(cwd, 'conf.json');

try{
	console.log(userconf)
	var stats = fs.statSync(userconf);
}catch(e){
	console.log("Generating default configuration file at", userconf);
	console.log("Please edit this file with your configuration parameters.");
	fs.writeFileSync(userconf, fs.readFileSync(defaultconfig));
}




