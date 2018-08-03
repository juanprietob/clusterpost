# couch-provider

Provide methods to interface with couchdb and your server application.

Upload documents, attachments, retrieve, modify and delete functions are provided.

**If you don't want to store attachments in the couchdb server you can provide a 'datapath' in the configuration. 
The attachments will be store in that location on your server.**

This package is implemented using [bluebird](https://github.com/petkaantonov/bluebird) Promises

----
	npm install couch-provider
----

## Usage

### Standalone usage, codename is always optional, if not provided it will use the 'default' name in your configuration
----
	//Multiple db configuration, namespace is optional, you can add multiple namespaces by providing an array
	var couchdbconfig = {
		"default" : "db1",
		"db1" : {
			"hostname": "http://localhost:5984",
			"database": "users1",
			"datapath": "/some/path/in/server"
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
	//	"namespace": "yourserverapp"
	//}

	var couchProvider = require('couch-provider').couchProvider;
	couchProvider.setConfiguration(confexample);

	var url = couchProvider.getCouchDBServer(codename);

---

#### Create the DB 
---

    return couchProvider.createDB("users1")
    .then(function(res){
        console.log(res);
    }); 

---

#### Upload a document
---
	
	var docs = [{
		"someinfo" : "someotherinfo"
	}];

	return couchProvider.uploadDocuments(docs, codename)
    .then(function(res){
        var docids = _.pluck(res, "id");//Underscore library https://underscorejs.org/
    });
---

#### Fetch documents
---

	return Promise.map(docids, function(docid){
        return couchProvider.getDocument(docid, codename);
    })
    .then(function(doc){
        console.log(doc);
    });
---
        
#### Add attachment
---
    var filename = path.join(__dirname, "README.md");
    var stream = fs.createReadStream(filename);

    return Promise.map(docids, function(docid){
        return couchProvider.getDocument(docid, codename)
        .then(function(doc){
            return couchProvider.addDocumentAttachment(doc, 'name/in/database.txt', stream, codename);
        });
    });
---
        
#### Get attachment
---

	return couchProvider.getDocument(docid, codename)
    .then(function(doc){
        return couchProvider.getDocumentAttachment(doc, 'name/in/database.txt', codename);
    })
    .then(function(res){
    	//res is a buffer with the file content
        console.log(res.toString());
    });

---

#### Get attachment stream
---

	return couchProvider.getDocument(docid, codename)
    .then(function(doc){
		var stream = couchProvider.getDocumentStreamAttachment(doc, 'name/in/database.txt', codename);        

		//Do something with the stream, write, pipe somewhere, etc. 
    });
---    

#### Delete attachment
---
	return Promise.map(docids, function(docid){
        return couchProvider.getDocument(docid, codename)
        .then(function(doc){
            return couchProvider.deleteAttachment(doc, "testname/README.md", codename);
        })
        .then(function(res){
            console.log(res);
        });
    });
---

#### Delete document
---
    return Promise.map(docids, function(docid){
        return couchProvider.getDocument(docid, codename)
        .then(function(doc){
            return couchProvider.deleteDocument(doc, codename);
        })
        .then(function(res){
            console.log("Document deleted", res);
        });
    });
---

###This package can be used as an Hapi plugin. 

---
	/*
	*	To use as an Hapi plugin, the methods will be available to your server application as server.methods.yourserverapp.*
	*	@server Hapi server object
	*	@couchdbconfig  couchdb configuration object with multiple databases, optionally use only one database
	*   @namespace      Optional namespace. The methods will be added to the Hapi server. For this example,
	*					the methods will be made available as server.methods.yourserverapp.*
	*					By default the namespace is couchprovider
	*/
	var plugin = {};
    plugin.register = require('couch-provider');
    plugin.options = couchdbconfig;
----

#### How to use couch-provider if used as an Hapi plugin:

1. getCouchDBServer(codename)

Returns the uri of couchdb ex. 'http://localhost:5984/users1'

----
	//yourserverapp is the namespace in the configuration. The namespace is used to add methods to the server. Check Hapi doc for more //information on server methods https://hapijs.com/tutorials/server-methods
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

5. deleteDocumentAttachment(doc, name, codename)

Delete the document attachment from couchdb or filesystem, the object doc is needed since deletion requires the document id and the revision number. 

----

	server.methods.yourserverapp.deleteDocument(doc)
	.then(function(res){
		console.log(res); //result of the operation
	});

----

6. addDocumentAttachment(doc, name, stream, codename)

Add the attachment to the document or filesystem. The stream parameter must implement 'pipe' method. See 'stream' documentation in node.js[nodejs.org].
name is a string and it is the name of the attachment

----

	server.methods.yourserverapp.addDocumentAttachment(doc, name, stream)
	.then(function(res){
		console.log(res); //result of the operation
	});

----

6. getDocumentURIAttachment(doc, name, codename)

Returns the full uri of an attachment. If using Hapi, you can use this method like:
Note: If you use the proxy method in Hapi, remember to include the h2o Hapi plugin. Otherwise you will have an error. 

----

	function getAttachment = function(request, reply){
		
		var docid = request.params.id;//If your Hapi handler method uses the doc id as parameter
		
		server.methods.yourserverapp.getDocument(docid)
		.then(function(doc){
			reply.proxy(server.methods.yourserverapp.getDocumentURIAttachment(doc, attachmentname));
		})
		.catch(function(e){
			rep(Boom.wrap(e));
		});
		
	}

----

7. getDocumentAttachment(doc, name, codename)

Get the attachment data

----

	server.methods.yourserverapp.getDocumentAttachment(doc, attachmentname)
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