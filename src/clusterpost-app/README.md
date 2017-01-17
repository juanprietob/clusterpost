# clusterpost-'app'

Retrieve your running tasks from the clusterpost-server directly to your desktop. 

## Installation

----
	npm install clusterpost-app
----

## Create script

Create a script named `clusterpostapp.js` with the following content.

----
	require(clusterpost-app);
----

## Running the script

----
	`node clusterpostapp.js`
----

To retrieve jobs: 

----
	Help: Download tasks from the server.
	Required parameters when login for first time:
	--server url, set the server url. ex., https://some.server:8180
	-u username
	-p password
	\nOptional parameters:
	--dir  Output directory, default: ./out
	--status one of [DONE, RUN, FAIL, EXIT, UPLOADING, CREATE], if this flag is provided, the job information will only be printed. By default, the behavior is status 'DONE' and download the results.
	--delete, default false, when downloading jobs with status 'DONE', the jobs will be deleted upon completion
	--j job id, default: all ids
	--executable executable, default: all executables
----

The server information and token will be saved to your home directory for future use. 


