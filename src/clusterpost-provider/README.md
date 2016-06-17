# clusterpost-provider

This is an [Hapi](http://hapijs.com/) plugin to Execute jobs in remote computing grids using a REST api. Data transfer, job execution and monitoring are all handled by clusterpost.

Clusterpost uses node with Hapijs in the server side application plus couchdb for storage.

Cluster post is easy to deploy and will integrate well with existing applications.

To install the server application check the documentation in [clusterpost-server](https://www.npmjs.com/package/clusterpost-server)

This is a sample configuration file for the plugin:

----
	{
		"privateKey": "GenerateSomeRandomKey",
		"saltRounds": 10,
		"algorithm": { 
			"algorithm": "HS256"
		},
		"algorithms": { 
			"algorithms": [ "HS256" ] 
		},
		"mailer": {
			"nodemailer": {
				"host": "smtp.gmail.com",
			    "secure": false,
			    "port": 587,
			    "auth": {
			        "user": "uname",
			        "pass": "pass"
			    }
			},
			"from": "clusterpost-server <clusterpost@gmail.com>",
			"message": "Hello @USERNAME@,<br>Somebody asked me to send you a link to reset your password, hopefully it was you.<br>Follow this <a href='@SERVER@/public/#/login/reset?token=@TOKEN@'>link</a> to reset your password.<br>The link will expire in 30 minutes.<br>Bye."
		},
		"userdb" : {
			"hostname": "http://localhost:5984",
			"database": "clusterjobs"
		}
	}
----

An easy way to generate a random key:

----
	openssl genrsa 128
----

Add your email configuration to use the 'reset' password service. 

This email account will be used to send a token to the user to reset the password in case they forgot it. 

Check https://github.com/nodemailer/nodemailer[nodemailer] for possible configurations

You can edit the message from mailer. The strings '@USERNAME@', @SERVER@ and @TOKEN@ are replaced during execution to personalize the message sent to the user.

Edit the userdb configuration to store user information. 

