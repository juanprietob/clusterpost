
module.exports = function (server, conf) {

	var jwt = require('jsonwebtoken');
	var bcrypt = require('bcrypt');
	const saltRounds = conf.saltRounds;
	var Boom = require('boom');
	var _ = require('underscore');

	var handler = {};

	handler.validate = function (req, decodedToken, callback) {


		return server.methods.clusterprovider.getView('_design/user/_view/info?key=' + JSON.stringify(decodedToken.email))
		.then(function(info){
			var info = _.pluck(info, "value");

			if(info.length > 1){
				throw "More than 1 user with same email found in DB!";
			}else if(info.length === 0){
				throw "User not found in DB!";
			}

			return info[0];
			
		})
		.then(function(userinfo){
			callback(undefined, true, userinfo);
		})
		.catch(function(err){
			callback(err, false, undefined);
		});
	}

	const bcryptHash = function(password){
		return new Promise(function(resolve, reject){
			bcrypt.hash(password, conf.saltRounds, function(err, hash) {
				if(err){
					reject(err);
				}else{
					resolve(hash);
				}
			});
		});
	}

	handler.createUser = function(req, rep){

		var email = req.payload.email;
		var password = req.payload.password;

		server.methods.clusterprovider.getView('_design/user/_view/info?key=' + JSON.stringify(email))
		.then(function(info){
			var info = _.pluck(info, "value");

			if(info.length === 0){
				return bcryptHash(password);
			}else{
				throw Boom.conflict("User already exists");
			}
		})
		.then(function(hash){

			var user = req.payload;
			user.password = hash;
			user.type = 'user';
			user.scope = ['clusterpost'];

			return server.methods.clusterprovider.uploadDocumentsDataProvider(user)
			.then(function(res){
				res = res[0];
				if(res.ok){
					return {
						token: jwt.sign({ email: user.email }, conf.privateKey, conf.algorithm )
					};
				}else{
					throw Boom.badData(res);
				}
			});
			
		})
		.then(rep)
		.catch(rep);

	}

	handler.login = function(req, rep){
		
		var email = req.payload.email;
		var password = req.payload.password;

		server.methods.clusterprovider.getView('_design/user/_view/hash?key=' + JSON.stringify(email))
		.then(function(hash){
			return _.pluck(hash, "value")[0];
		})
		.then(function(hash){
			return new Promise(function(resolve, reject){
				bcrypt.compare(password, hash, function(err, res) {
					if(res){
						resolve({ token: jwt.sign({ email: email }, conf.privateKey, conf.algorithm ) });
					}else{
						reject(err);
					}
				});
			});
		})
		.then(rep)
		.catch(function(err){
			rep(Boom.unauthorized(err));
		});
	}

	handler.deleteUser = function(req, rep){
		
		var credentials = req.auth.credentials;

		server.methods.clusterprovider.deleteDocument(credentials._id, credentials._rev)
		.then(rep)
		.catch(function(err){
			rep(Boom.conflict(err));
		})
	}

	return handler;
}

