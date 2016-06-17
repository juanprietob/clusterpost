# hapi-jwt-couch

Hapi plugin to validate users using hapi-auth-jwt[https://github.com/ryanfitz/hapi-auth-jwt], storing user information and encrypted passwords 
in a couchdb instance. 

This plugin also provides a 'recover my password' option by setting up an email account using nodemailer[https://github.com/nodemailer/nodemailer].


## Usage 

----
	npm install hapi-jwt-couch
----

### Hapi plugin

----
	const Hapi = require('hapi');

	var hapijwtcouch = {};
	hapijwtcouch.register = require("hapi-jwt-couch");
	hapijwtcouch.options = {
	        "privateKey": "SomeRandomKey123",
	        "saltRounds": 10,
	        "algorithm": { 
	            "algorithm": "HS256"
	        },
	        "algorithms": { 
	            "algorithms": [ "HS256" ] 
	        },
	        "mailer": {
	            "nodemailer": {
					host: 'smtp.gmail.com',
				    port: 465,
				    secure: true, // use SSL
				    auth: {
				        user: 'hapi.jwt.couch@gmail.com',
				        pass: 'pass'
				    }
				},
				"from": "Hapi jwt couch <hapi.jwt.couch@gmail.com>",
				"message": "Hello @USERNAME@,<br>Somebody asked me to send you a link to reset your password, hopefully it was you.<br>Follow this <a href='@SERVER@/public/#/login/reset?token=@TOKEN@'>link</a> to reset your password.<br>The link will expire in 30 minutes.<br>Bye."
	        },
	        "userdb" : {
	            "hostname": "http://localhost:5984",
	            "database": "hapijwtcouch"
	        }
	    };

	var hapiauth = {};
	hapiauth.register = require("hapi-auth-jwt");
	hapiauth.options = {};


	var plugins = [hapiauth, hapijwtcouch];

	var server = new Hapi.Server();
	server.connection({ 
	    port: "3000"
	});

	server.register(plugins, function(err){
	    if (err) {
	        throw err; // something bad happened loading the plugin
	    }

	    server.start(function (err) {

	        console.log("server running", server.info.uri);
	        
	    });
	});
----

## Create your own Hapi plugin and extend it 

You can extend this plugin by adding your own validation function. You may also change the validation for user, password and login Joi objects.
For the routes 

The Joi objects shown here for password, user and login are used by default.

----

	exports.register = function (server, conf, next) {
		
        conf.password = Joi.string().regex(/^(?=.*[\d])(?=.*[A-Z])(?=.*[a-z])[\w\d!@#$%_-]{6,40}$/);
	    

	    conf.user = Joi.object().keys({
	        name: Joi.string().required(),
	        email: Joi.string().email().required(),
	        password: password
	    });

	    conf.login = Joi.object().keys({
	        email: Joi.string().email().required(),
	        password: password
	    });

		const validate = function(req, decodedToken, callback){
			//validate your decoded token
		}

		conf.validate = validate;

		return require('hapi-jwt-couch').register(server, conf, next);
		
	};

	exports.register.attributes = {
	  pkg: require('./package.json')
	};

----

