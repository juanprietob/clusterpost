
var help = function(){
    console.error("help: Update a document in the views folder with the version running at some couchdb instance. Default: localhost:5984");
    console.error("NODE_ENV=production|test " + process.argv[0] + " " + process.argv[1] + " -design <name of design document>");
    return 1;
}

const getConfigFile = function (env, base_directory) {
  try {
    // Try to load the user's personal configuration file
    return require(base_directory + '/conf.my.' + env + '.json');
  } catch (e) {
    // Else, read the default configuration file
    return require(base_directory + '/conf.' + env + '.json');
  }
};

var design = undefined;

for(var i = 0; i < process.argv.length; i++){
    if(i < process.argv.length - 1){
        if(process.argv[i] === "-design"){
            design = process.argv[i+1];
        }
    }
}

var env = process.env.NODE_ENV;

if(design === undefined || !env){
    if(!env){
        console.error("Please set NODE_ENV variable.");
    }
    return help();
}

var Promise = require('bluebird');
var request = require('request');
var fs = require('fs');
var path = require('path');


var basedir = path.dirname(process.argv[1]);
var conf = getConfigFile(env, basedir + '/..');
var dataprovider = conf.dataproviders[conf.default.dataprovider];
var uri = dataprovider.hostname + "/" + dataprovider.database + "/_design/" + design;

request(uri, function(err, res, body){
	if(err) {
		console.error(err);
		return 1;
	}
	if(body !== ""){
		var jsonbody = JSON.parse(body);
		delete jsonbody._rev;
		var jsonstring = JSON.stringify(jsonbody, null, 4);
        var viewfilename = basedir + '/views/' + design + '.json';
		var write = fs.writeFile(viewfilename, jsonstring, function(err){
            if(err) {
                console.error(err)
                return 1;
            }

            console.log('View updated: ', viewfilename);
        });
	}
	
});
