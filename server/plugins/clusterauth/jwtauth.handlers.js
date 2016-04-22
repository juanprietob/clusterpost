
module.exports = function (server, conf) {

	var jwt = require('jsonwebtoken');
	var bcrypt = require('bcrypt');
	const saltRounds = conf.saltRounds;

	var handler = {};

	var accounts = {
	    123: {
	        id: 123,
	        user: 'john',
	        fullName: 'John Doe',
	        scope: ['a', 'b']
	    }
	};	

	handler.validate = function (req, decodedToken, callback) {

	    var error,
	        credentials = accounts[decodedToken.accountId] || {};

	    

	    console.log(decodedToken);
	    console.log(credentials);

	    if (!credentials) {
	        return callback(error, false, credentials);
	    }

	    return callback(error, true, credentials)
	}

	handler.createUser = function(req, rep){

		bcrypt.hash(req.payload.password, conf.saltRounds, function(err, hash) {
			var user = req.payload;
			user.password = hash;
			user.type = 'user';
			user.scope = ['clusterpost'];

			server.methods.clusterprovider.uploadDocumentsDataProvider(user)
			.then(function(res){
				if(res.ok){
					return jwt.sign({ email: user.email }, conf.privateKey, conf.algorithm );
				}else{

				}
			});


		});

	}

	handler.login = function(req, rep){
		
		bcrypt.compare(req.payload.password, hash, function(err, res) {
			if(res){
				var token = jwt.sign({ userEmail: "juanprietob@gmail.com" }, conf.privateKey, conf.algorithm );
			}else{
				rep(Boom.una)
			}
		});
	}

	return handler;
}

