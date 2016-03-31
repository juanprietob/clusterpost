var fs = require('fs');
var child_process = require('child_process');
var request = require('request');
var Promise = require('bluebird');
var qs = require('querystring');
var path = require('path');

var env = process.env.NODE_ENV;

if(!env){
	console.error("Please set NODE_ENV variable.");
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

const getAllProviders = function(conf){
	var temp = [];
	for(var servercodename in conf.couchdblist){
    	var couchdbparams = conf.couchdblist[servercodename];
    	temp.push(couchdbparams.couchdb + couchdbparams.database);
    }
	return temp;
}

const createDB = function(name){
	return new Promise(function(resolve, reject){
		request.put(name, function(err, res, body){
			if(err) reject(err.message);
			try{
				if(JSON.parse(body).error === "not_found"){
					request.put(name, function(err, res, body){
						resolve(JSON.parse(body));
					});
				}else{
					resolve(JSON.parse(body));
				}
			}catch(e){
				console.error(name);
				console.error(e);
				reject(e);
			}
			
		})
	});
}

const updateDocuments = function(db, viewsdir){

	var fileviews = fs.readdirSync(viewsdir); 

	var testView = function(file){
		return new Promise(function(resolve, reject){
			try{
				if(file.indexOf(".json") === -1) reject(file);

				fs.readFile(viewsdir+file, function (err, data) {
					if (err) throw err;
					
					var designdoc = JSON.parse(data);

					var options = {
						uri: db + "/" + designdoc._id
					}

					request(options, function(err, res, body){
						var couchdesigndoc = JSON.parse(body);

				  		if(JSON.stringify(designdoc.views) !== JSON.stringify(couchdesigndoc.views)){

				  			var uri = db + "/" + designdoc._id;
				  			if(couchdesigndoc._rev){
				  				designdoc._rev = couchdesigndoc._rev;
				  				uri += "?rev="+designdoc._rev;
				  			}
					  		console.log(couchdesigndoc);
					  		var options = {
								uri :  uri,
								method : 'PUT',
								json : designdoc
							}

							request(options, function(err, res, body){
								if(err) reject(err.message);
								resolve(body);
							});

					  	}else{
				  			console.log("No changes in document: " + viewsdir+file + ", in db: " + db);
				  		}
					});
				});
			}catch(e){
				reject(e);
			}
		});
	}

	return Promise.map(fileviews, testView);
}

var basedir = path.dirname(process.argv[1]);
var conf = getConfigFile(env, "../");
var dataprovider = conf.dataproviders[conf.default.dataprovider];
var clusterdb = dataprovider.hostname + "/" + dataprovider.database;
var viewsdir = basedir + '/views/';

createDB(clusterdb)
.then(function(result){
	return updateDocuments(clusterdb, viewsdir);
})
.then(console.log)
.catch(console.error)

