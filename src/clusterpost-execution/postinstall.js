var fs = require('fs');
var path = require('path');

var cwd = process.cwd();
var installdir = path.join(process.cwd(), "../../");

var defaultconfig = fs.readFileSync(path.join(cwd, "conf.json.in"));

try{
	var stats = fs.statSync(path.join(installdir, 'conf.json'));
}catch(e){
	console.log("Generating default configuration file...");
	console.log("Please edit this file with your configuration parameters.");
	fs.writeFileSync(path.join(installdir, 'conf.json'), defaultconfig);
}

try{

	var index = fs.readFileSync(path.join(cwd, "index.js.in"));
	fs.writeFileSync(path.join(installdir, 'index.js'), index);

}catch(e){

}