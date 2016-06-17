# couch-provider

Provide methods to interface with couchdb and your server application.

Upload documents, attachments, retrieve, modify and delete functions are provided.

This package can be used as an Hapi plugin. 

It is implemented using bluebird[https://github.com/petkaantonov/bluebird] Promises

----
	npm install couch-provider
----

## Usage

----
	//Multiple db configuration, namespace is optional
	var couchdbconfig = {
		"default" : "db1",
		"db1" : {
			"hostname": "http://localhost:5984",
			"database": "users1"
		},
		"db2" : {
			"hostname": "http://yourdomain.com",
			"database": "users2"
		},
		"namespace": "yourserverapp"
	}

	//Single db configuration, namespace is optional
	//var couchdbconfig = {
	//	"hostname": "http://localhost:5984",
	//	"database": "users1",
	//  "namespace": "yourserverapp"
	//}

	/*
	*	To use as an Hapi plugin, the methods will be available to your server application as server.methods.yourserverapp.*
	*	@server Hapi server object
	*	@couchdbconfig  couchdb configuration object with multiple databases, optionally use only one database
	*   @namespace      Optional namespace. The methods will be added to the Hapi server. For this example,
	*					the methods will be made available as server.methods.couchprovider.*
	*/
	var plugin = {};
    plugin.register = require('couch-provider');
    plugin.options = couchdbconfig;

	

	/*
	*	You can also use couch-provider as
	*	All methods will be available in couchprovider variable
	*/
	//var couchprovider = require('couch-provider').couchProvider;
----


### Available methods: 

The parameter codename is optional, if you use a codename, you must use the multiple db configuration object.

How to use couch-provider if used as an Hapi plugin:

1. getCouchDBServer(codename)

Returns the uri of couchdb ex. 'http://localhost:5984/users1'

----

	var uri = server.methods.yourserverapp.getCouchDBServer(codename);

----



2. uploadDocuments(docs, codename)

Add a new document, the parameter docs can be either an array of json objects or a single object

----

	server.methods.yourserverapp.uploadDocuments(docs)
	.then(function(res){
		console.log(res); //result of the couchdb operation
	});

----

3. getDocument(id, codename)

Get a document from the db given an id

----

	server.methods.yourserverapp.getDocument(id)
	.then(function(res){
		console.log(res); //document
	});

----

4. deleteDocument(doc, codename)

Delete the document from couchdb, the object doc is needed since deletion requires the document id and the revision number. 

----

	server.methods.yourserverapp.deleteDocument(doc)
	.then(function(res){
		console.log(res); //result of the operation
	});

----

5. addDocumentAttachment(doc, name, stream, codename)

Add the attachment to the document. The stream parameter must implement 'pipe' method. See 'stream' documentation in node.js[nodejs.org].
name is a string and it is the name of the attachment

----

	server.methods.yourserverapp.addDocumentAttachment(doc, name, stream)
	.then(function(res){
		console.log(res); //result of the operation
	});

----

6. getDocumentURIAttachment(uri, codename)

Returns the full uri of an attachment. If using Hapi, you can use this method like:
Note: If you use the proxy method in Hapi, remember to include the h2o Hapi plugin. Otherwise you will have an error. 

----

	function getAttachment = function(request, reply){
		
		var docid = request.params.id;//If your Hapi handler method uses the doc id as parameter
		
		server.methods.yourserverapp.getDocument(docid)
		.then(function(doc){
			reply.proxy(server.methods.yourserverapp.getDocumentURIAttachment(doc._id + "/" + attachmentname));
		})
		.catch(function(e){
			rep(Boom.wrap(e));
		});
		
	}

----

7. getDocumentAttachment(uri, codenmae)

Get the attachment data

----

	server.methods.yourserverapp.getDocumentAttachment(doc._id + "/" + attachmentname)
	.then(function(data){
		console.log(data);
	});

----

8. getView(view, codename)

The view parameter is the path to the couchdb view ex. '_design/user/_view/info'. 

----

	server.methods.yourserverapp.getView('_design/user/_view/info')
	.then(function(data){
		console.log(data);
	});

----