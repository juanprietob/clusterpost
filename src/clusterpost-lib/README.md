# clusterpost-lib

It implements the API to submit jobs to [clusterpost-server](https://www.npmjs.com/package/clusterpost-server)

An example to submit a job:

----
	var clusterpost = require("clusterpost-lib");

	var inputfiles = [];

	inputfiles.push(path.join(inputdir, "/some/path/img.jpg"));
	inputfiles.push(path.join(inputdir, "/some/path/img1.jpg"));
	inputfiles.push(path.join(inputdir, "/some/path/img2.jpg"));


	var job = {
	    "executable": "aVeryExpensiveTask",
	    "parameters": [
	        {
	            "flag": "--img",
	            "name": "img.jpg"
	        },
	        {
	            "flag": "--mask",
	            "name": "img1.jpg"
	        },
	        {
	        	"flag": "-labelValue",
	        	"name": "6"
	        },
	        {
	            "flag": "--labelImg",
	            "name": "pvec.nii.gz"
	        },
	        {
	        	"flag": "--outDir",
	            "name": "./"	
	        }
	    ],
	    "inputs": [
	        {
	            "name": "img.jpg"
	        },
	        {
	            "name": "img1.jpg"
	        },
	        {
	            "name": "img2.jpg"
	        }
	    ],
	    "outputs": [
	        {
	            "type": "tar.gz",
	            "name": "./"
	        },
	        {
	            "type": "file",
	            "name": "stdout.out"
	        },
	        {
	            "type": "file",
	            "name": "stderr.err"
	        }
	    ],
	    "type": "job",
	    "userEmail": "juanprietob@gmail.com"
	};


	clusterpost.setClusterPostServer("https://localhost:8180");

	var agentoptions = {
		rejectUnauthorized: false //You can also read a certificate here if you want to use https connection and remove this
	}
	clusterpost.setAgentOptions(agentoptions);

	clusterpost.userLogin({
		"email": "your@email.com",
		"password": "passwd"
		})
	.then(function(res){
		return clusterpost.getExecutionServers();
	})
	.then(function(res){
		job.executionserver = res[0].name; //Or select the computing grid where you want to submit your job.
		return clusterpost.createAndSubmitJob(job, inputfiles)
	})
	.then(function(jobid){
		console.log(jobid);//Job id of the task submitted
	})
	.catch(console.error)
----


Once your job is submitted, you can retrieve the results with the following script

----
	var clusterpost = require("clusterpost-lib");

	clusterpost.setClusterPostServer("https://localhost:8180");

	var agentoptions = {
		rejectUnauthorized: false
	}

	clusterpost.setAgentOptions(agentoptions);

	clusterpost.userLogin({
		"email": "your@email.com",
		"password": "passwd"
		})
	.then(function(res){
	    return clusterpost.getJobs("aVeryExpensiveTask");
	})
	.then(function(res){
	    console.log(res);
	})
	.catch(console.error)
----
