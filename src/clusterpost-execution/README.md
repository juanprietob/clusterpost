
# clusterpost-execution

1. Install [nvm](https://github.com/creationix/nvm[nvm) and node (v4.4.5^).

2. Create a folder, navigate to it and run the following command.

----
	npm install clusterpost-execution -g
----

This installation step generated a conf.json file

## Configuration

Edit conf.js with a local path to store the data in the local machine and the URL of the machine running the clusterpost-server application -> https://youripaddress:8180

### Configuration options:
----
	{
		"uri": "http://localhost:8180",
		"engine" : "engine_unix",
		"detached": true,
		"maxjobs": 1,
		"storagedir" : "./path/to/clusterpost_storage",
		"executionserver": "some_name",
		"tokenfile": "./path/to/token.json",
		"local_fs": {"default": "local_test", "local_test": {"path": "./path/to/local/data/"}}
		"aws_params" : {
				  "cluster": "name-of-ecs-cluster",
				  "launchType": "FARGATE",
				  "taskDefinition": "",
				  "networkConfiguration": {
				      "awsvpcConfiguration" :
				      {
				        "subnets": ["subnet-id-for-aws-ecs-vpc-public"],
				        "securityGroups": ["sg-id-for-aws-ecs-vpc"],
				        "assignPublicIp": "ENABLED"
				      }
				  },
				  "overrides": {
				      "containerOverrides":
				      [
				        {
				          "name": "",
				          "command": []
				        }
				      ]
				  }
				},
		"aws_params_gpu" : {
				  "cluster": "name-of-ecs-cluster-with-ec2",
				  "launchType": "EC2",
				  "taskDefinition": "",
				  "overrides": {
				      "containerOverrides":
				      [
				        {
				          "name": "",
				          "command": [],
				          "resourceRequirements": [
				          	{
				          		"type":"GPU",
				          		"value":"1"
				          	}
				          ]
				        }
				      ]
				  }
				},
		"aws_region" : "aws-deployment-region"
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

	# AWS ECS manager
	Change your configuration file to 'engine_awsecs'

#### detached

This option is only available for 'engine_unix'.
Run detached jobs, i.e., run the process in the background. Use with option maxjobs to allow only a single or multiple tasks in the same engine.

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

#### aws_params

If the clusterpost-execution is run in AWS's ECS cluster management mode, aws_params and aws_region will be needed. Use the template in the example above to fill the cluster-name, subnet, and security group fields from your AWS ECS cluster information. It is also assumed that the task definitions have been setup in your AWS ECS. Task definitions should be named same as the software name. Refer to [AWS CLI reference](https://docs.aws.amazon.com/cli/latest/reference/ecs/run-task.html) for details on the fields of AWS configuration.

#### aws_params_gpu

If the clusterpost-execution is run in AWS's ECS cluster management mode and the task needs a gpu, aws_params)gpu and aws_region will be needed. Use the template in the example above to fill the cluster-name, from your AWS ECS cluster information. It is also assumed that the task definitions have been setup in your AWS ECS with network mode as 'host' (not awsvpc). Task definitions should be named same as the software name. Refer to [AWS CLI reference](https://docs.aws.amazon.com/cli/latest/reference/ecs/run-task.html) for details on the fields of AWS configuration.

#### aws_region

If the clusterpost-execution is run in AWS's ECS cluster management mode, this parameter specifies the deployment region. Use one in the list on [AWS](https://docs.aws.amazon.com/AmazonECS/latest/userguide/what-is-fargate.html) based on where the AWS ECS cluster has been configured.

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

#### AWS ECS clusterpost-execution

The node running in awsecs mode should have AWS credentials setup. Follow these steps to allow a user in a managed AWS account to be able to modify an ECS resource.

Refer to: [https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html](https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html)

- Copy the ARN of the ECS cluster (this should be visible under ECS→ <cluster name> )
- Create new policy (ecs-policy)
    - In IAM, go to policies, create policy
    - Under the JSON tab add the following text:

    ```json
    {
        "Version": "<THIS WILL BE GIVEN>",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": "ecs:*",
                "Resource": "*"
            },
            {
                "Effect": "Allow",
                "Action": "ecs:*",
                "Resource": "<GIVE CLUSTER ARN>"
            }
        ]
    }
    ```

    - Validate the policy, and create it after adding any tags
- In IAM, create a new user (hinashah)
    - Allow Programmatic Access, and AWS Management console access
    - In Set permissions, chose 'attach existing policies directly', and chose ecs-policy (created above),AmazonECSTaskExecutionRolePolicy, and AmazonECS_FullAccess
    - Next add any tags, review and create
    - DOWNLOAD the csv with access key ID and secret access key
- On the compute node/target machine where you want to run AWS
    - install awscli
    - run `aws configure` and supply the access key id, and secret access key above
    - test with `aws ecs list-clusters`
