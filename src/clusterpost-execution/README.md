
# clusterpost-execution

1. Install [nvm](https://github.com/creationix/nvm[nvm) and node (v4.4.5^).

2. Create a folder, navigate to it and run the following command.

----
	npm install clusterpost-execution
----

This installation step generated a conf.json file and index.js

## Configuration

Edit conf.js with a local path to store the data in the local machine and the URL of the machine running the clusterpost-server application -> https://youripaddress:8180

For version 

### Configuration options:
----
	{
		"uri": "http://localhost:8180",
		"engine" : "engine_unix", 
		"detached": "false",
		"storagedir" : "./path/to/clusterpost_storage",
		"executionserver": "some_name",
		"tokenfile": "./path/to/token.json",
		"local_storage": {"default": "local_test", "local_test": {"path": "./path/to/local/data/"}}
	}
----

#### uri

Web address for the clusterpost-server

#### engine

Engine type to run the back end. See list below for options.

##### Supported grid engines

	* UNIX unix based systems

	Change your configuration file to 'engine_unix'

	* LSF load sharing facilities

	Change your configuration file to 'engine_lsf'

	* PBS Sun Grid Engine jobs and queues

	Change your configuration file to 'engine_pbs'

	# SLURM Workload Manager

	Change your configuration file to 'engine_slurm'

#### detached

This option is only available for 'engine_unix'.
Run detached jobs, i.e., run the process in the background. 

#### storagedir

Path to a local storage, this location is used to create unique directories and run the tasks.

#### executionserver

Remote execution only. 
Name of the execution server. This option is required when running with --remote flag.
This name is used to retrieve the corresponding tasks to run. 

#### tokenfile

Remote execution only. 
Token used to authenticate in the clusterpost-server. 
Download using the web-interface if you have it installed [clusterpost-list-react](https://www.npmjs.com/package/clusterpost-list-react) or perform a get request to '/executionserver/tokens'

#### local_storage

If you are running the execution-server using a shared drive used by the [clusterpost-server](https://www.npmjs.com/package/clusterpost-server). Set the path of the shared drive, this 
will avoid unnecessary data transfers. 

#### Token configuration

##### SSH configuration

The authentication token is copied from the clusterpost-server to the computing grid via 'ssh'. It will be copied to the 
'execution_server' path set in the configuration.

##### Remote clusterpost-execution

The authentication token needs to be downloaded from the server and set in the 'clusterpost_execution' configuration. 
You may add the following fields to the conf.json. 

----
	{
		"tokenfile": "/path/to/the/token.json"		
	}
----

or

----
	{
		"token": "copy and paste the token from the downloaded file"
	}
----

or rename the file token.json to '.token' and copy it into the clusterpost-execution folder in the computing grid. 


2.1 Remote execution only
	
This tool allows users to execute the clusterpost-execution 

2.2 For versions previous to v1.1.0

If you configured the clusterpost-server with an SSL certificate, you will need a copy of the certificate.

To retrieve the certificate from the server running clusterpost-server

----
	openssl s_client -showcerts -connect localhost:8180 </dev/null 2>/dev/null | openssl x509 -outform PEM > certificate.pem
----

Where localhost:8180 must be changed by the IP address running clusterpost-server.

Change the path to the certificate accordingly in the configuration file