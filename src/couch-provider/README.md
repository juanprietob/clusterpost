# couch-provider

Provide methods to interface with couchdb and your server application.

Upload documents, attachments, retrieve, modify and delete functions are provided.

----
	npm install couch-provider
----

## Usage

----
	//Multiple db configuration
	var couchdbconfig = {
		"default" : "db1",
		"db1" : {
			"hostname": "http://localhost:5984",
			"database": "users1"
		},
		"db2" : {
			"hostname": "http://yourdomain.com",
			"database": "users2"
		}
	}

	//Single db configuration
	//var couchdbconfig = {
	//	"hostname": "http://localhost:5984",
	//	"database": "users1"
	//}

	var namespace = 'couchprovider';

	/*
	*	@server Hapi server object
	*	@couchdbconfig  couchdb configuration object with multiple databases, optionally use only one database
	*   @namespace      Optional namespace. The methods will be added to the Hapi server. For this example,
	*					the methods will be made available as server.methods.couchprovider.*
	*/
	require('couch-provider')(couchdbconfig, server, namespace);

	/*
	*	The methods will be added to the hapi server if the parameter namespace is specified, otherwise use couch-provider 
	*/
	//var couchprovider = require('couch-provider')(couchdbconfig);
----


### Available methods: 

The parameter codename is optional, if you use a codename, you must use the multiple db configuration object.

1. getCouchDBServer(codename)

Returns the uri of couchdb ex. 'http://localhost:5984/users1'

2. uploadDocuments(docs, codename)

Add a new document, the parameter docs can be either an array of json objects or a single object

3. getDocument(id, codename)

Get a document from the db given an id

4. deleteDocument(doc, codename)

Delete the document from couchdb, the object doc is needed since deletion requires the document id and the revision number. 

5. addDocumentAttachment(doc, name, stream, codename)

Add the attachment to the document. The stream parameter must implement 'pipe' method. See 'stream' documentation in node.js[nodejs.org]

6. getDocumentURIAttachment(uri, codename)

Returns the uri of an attachment

7. getDocumentAttachment(uri, codenmae)

Get the attachment data

8. getView(view, codename)

The view parameter is the path to the couchdb view ex. '_design/user/_view/info'. 

----