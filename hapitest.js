const Hapi = require('hapi');
const server = new Hapi.Server();
var fs= require('fs');
var path = require('path');


server.connection({ 
    host: 'localhost', 
    port: 8000 
	});
const getConfigFile = function (env, base_directory) {
  try {
    // Try to load the user's personal configuration file
    return require(base_directory + '/conf.my.' + env + '.json');
  } catch (e) {
    // Else, read the default configuration file
    return require(base_directory + '/conf.' + env + '.json');
  }
};


var env = process.env.NODE_ENV;
if(!env){ env = 'test' };

var conf = getConfigFile(env, "./");
console.log('conf',conf.testshinytooth.database);
server.register(
    [require('h2o2'),{ register: require('./index'), options: conf }]//This is loading couch-provider
, function (err) {

    if (err) {
        console.log('Failed to load h2o2');
    }
   // var Uri='http://Loic_Michoud:secret@localhost:5984/testshinytooth/'+ docId;
    server.route({
    method: 'GET',
    path: '/test/{docId}/{docName}',
    handler: function(request, reply){
    		// var route;
    		console.log('handler test server', request.params.docId);
    		var name = request.params.docName;
    		// console.log(conf.testshinytooth.hostname);
    		server.methods.couchprovider.getDocument(request.params.docId)
    		.then(function(doc){
    			//var uri=path.join(conf.testshinytooth.hostname,conf.testshinytooth.database, request.params.docId);
    			// var Uri=conf.testshinytooth.hostname+'/'+conf.testshinytooth.database+'/'+request.params.docId;
    			// var name=request.params.docName;
    			// var codename=conf.testshinytooth;
    		// TODO: Get document from database using docId
    		// Get name from parameters
    		// Call the URIv2 function. This function must contain a onResponse Functiom
    		//in the onResponse function, put content of the file using a pipe
    		console.log(server.methods.couchprovider)
    			var uri = server.methods.couchprovider.getDocumentURIAttachment(doc, name);
    			reply.proxy(uri);
    		});
    	}
    });



        //proxy: {
            //uri: Uri//'http://Loic_Michoud:secret@localhost:5984/testshinytooth/62b5ca391c27ba84a433615733133624'
    //      mapUri: function (request, callback) {


    //             var uri = Uri;
    //             callback(null, Uri);
    //         },
    //         onResponse: function (err, res, request, reply) {
    //         	//var path=JSON.stringify(res[0]);
            	
    //         	var path = [];
				// JSON.stringify(res, function(key, value) {
				//     if (typeof value === 'object' && value !== null) {
				//         if (path.indexOf(value) !== -1) {
				//             return;
				//         }
				//         // Store value in our collection
				//         path.push(value);
				//     }
				//     return value;
				// });
				// var pathattchment='/Users/loicmichoud/Desktop/'+path;
    //         	var payload=fs.readFileSync(pathattchment).toString();
    //             //reply(res).path;
    //             reply(payload).headers = res.headers;
           // }






        // onResponse: function(err, res, request, reply, settings, ttl){
        //    console.log(res); 
        //    reply(res);
        // },
            //uri: 'http://Loic_Michoud:secret@localhost:5984/testshinytooth/62b5ca391c27ba84a433615733133624'
        //}

	
 
  

    server.start(function (err) {
        console.log('Server started at:'+ server.info.uri);
    });
});
 