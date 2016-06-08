# clusterpost-server

Execute jobs in remote computing grids using a REST api. Data transfer, job execution and monitoring are all handled by clusterpost.

Clusterpost uses node with Hapijs in the server side application plus couchdb for storage.

Cluster post is easy to deploy and will integrate well with existing applications.

## Installation

----
	npm install clusterpost-server
----

During the installation, the files 'conf.production.json', 'conf.test.json' and index.js were generated. 
You must edit conf.production.json and/or conf.test.json with your configuration options.

To run clusterpost in production mode run:

----
	NODE_ENV=production node index.js
----

## Configuration

### TLS to enable HTTPS (recommended)

You must either acquire a certificate or generate a selfsigned certificate by running the following commands:

----
	openssl genrsa -out key.pem 2048
	openssl req -new -key key.pem -out csr.pem
	openssl req -x509 -days 365 -key key.pem -in csr.pem -out certificate.pem
----

Finally edit the paths for 'tls' in the configuration section.

### clusterpost-provider (database):

Edit the data provider configuration for the couchdb instance (default config should work out of the box). 

Run the following command to test if you have a running couchdb instance

----
	curl http://localhost:5984
----

You should see the following output:

----
	{"couchdb":"Welcome","uuid":"b57a566769e70a49d251deac508ce1df","version":"1.6.1","vendor":{"version":"1.6.1","name":"The Apache Software Foundation"}}
----

### Configure the nodemailer provider

This email account will be used to send a token to the user to reset the password in case they forgot it. 

Check https://github.com/nodemailer/nodemailer[nodemailer] for possible configurations

### Generate random key for pasword encryption

An easy way to generate a random key is done by typing the command:

----
	openssl genrsa 128
----

Save this key in your configuration file. This is the key used to encrypt the password and save them in the DB. 

### Executionservers:

Edit this field with the ssh configuration to connect to your computing grid.

You must generate a pair of private and public keys and be able to connect without entering a password.

'sourcedir' must point to the installation path of the 'clusterpost-execution' package.

To install this package follow the instruction in section [clusterpost-execution](https://www.npmjs.com/package/clusterpost-execution).

#### SSH Tunneling

If the clusterpost-server app does not have a public IP address and is not reachable from the outside, you can create an SSH tunnel to the computing grid by running:

----
	ssh username@computinggrid -R 8180:localhost:8180
---

This ssh command will create a reverse tunnel that will allow communication from clusterpost-execution to the clusterpost-server application.

##### Multiple login nodes. 

Frequently, a computing grid will have many login nodes. This poses a problem since the tunnel that we generated before will work only on the login node with the active ssh tunnel. 
 
To solve this issue, create a connection to one specific login node and use this login node for all future requests.

This is achieved by running.

1. ssh -T -N -f username@computinggrid -L 2222:localhost:22

2. ssh -T -N -f username@localhost -R 8180:localhost:8180

This will ensure that we will always be connected to the same login node all the time and we the tunnel will be available. 


### Starting the clusterpost-server. 

During installation, a script 'index.js' was generated with the following code.

--------
	require('clusterpost-server');

	clusterpostserver.server.start(function () {
		clusterpostserver.server.log('info', 'Server running at: ' + clusterpostserver.server.info.uri);
});
--------

You can also add your own plugins to this Hapi server by adding them to the configuration file. Check the Hapi [tutorial](http://hapijs.com/tutorials/plugins) to start developing a new extension.

Optionally, you can add your own plugin by registering the plugin to the server as an example, the plugin static is added to clusterpost-server

----
	var clusterpostserver = require('clusterpost-server');


	var plugin = {};
	plugin.register = require("./static");
	plugin.options = {};

	clusterpostserver.server.register(plugin, function(err){
	    if (err) {
	        throw err; // something bad happened loading the plugin
	    }

	    clusterpostserver.server.start(function () {
		   clusterpostserver.server.log('info', 'Server running at: ' + clusterpostserver.server.info.uri);
		});
	    
	});
----

Start the server by running:

----
	NODE_ENV=<production|test> node index.js
----

The parameter production or test will read from the configuration file generated.

Once you have started the server, visit http://localhost:8180/docs to check the API documentation for clusterpost.