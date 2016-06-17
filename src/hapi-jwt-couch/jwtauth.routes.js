
module.exports = function (server, conf) {

    var handlers = require('./jwtauth.handlers')(server, conf);
    var Joi = require('joi');

    var password = Joi.string().regex(/^(?=.*[\d])(?=.*[A-Z])(?=.*[a-z])[\w\d!@#$%_-]{6,40}$/);

    if(conf.password){
        password = conf.password;
    }

    var user = Joi.object().keys({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        password: password
    });

    if(conf.user){
        user = conf.user;
    }

    var login = Joi.object().keys({
        email: Joi.string().email().required(),
        password: password
    });

    if(conf.login){
        login = conf.login;
    }

    const validate = function (req, decodedToken, callback) {
        
        handlers.validateUser(req, decodedToken)
        .then(function(res){
            callback(undefined, true, res);
        })
        .catch(function(err){
            if(conf.validate){
                conf.validate(req, decodedToken, callback);
            }
        });
        
    }

    server.auth.strategy('token', 'jwt', {
        key: conf.privateKey,
        validateFunc: validate,
        verifyOptions: conf.algorithms  // only allow HS256 algorithm
    });
    

    /*
    *   Create user in DB. 
    */
    server.route({
        method: 'POST',
        path: '/auth/user',
        config: {
            auth: false,
            handler: handlers.createUser,
            validate: {
                query: false,
                payload: user,
                params: false
            },
            response: {
                schema: Joi.object().keys({
                    token: Joi.string().required()
                })
            }
        }
    });

    /*
    *   Get user
    */

    server.route({
        method: 'GET',
        path: '/auth/user',
        config: {
            auth: {
                strategy: 'token',
                scope: ['clusterpost']
            },
            handler: handlers.getUser,
            validate: {
                query: false,
                payload: false,
                params: false
            },
            response: {
                schema: Joi.object().keys({
                    name: Joi.string(),
                    email: Joi.string(), 
                    scope: Joi.array().items(Joi.string())
                })
            }
        }
    });

    /*
    *   Delete user from DB
    */
    server.route({
        method: 'DELETE',
        path: '/auth/user',
        config: {
            auth: {
                strategy: 'token',
                scope: ['clusterpost']
            },
            handler: handlers.deleteUser
        }
    });

    /*
    * User login
    */
    server.route({
        method: 'POST',
        path: '/auth/login',
        config: {
            auth: false,
            validate: {
                query: false,
                payload: login,
                params: false
            },
            handler: handlers.login,
            response: {
                schema: Joi.object().keys({
                    token: Joi.string().required()
                })
            }
        }
    });

    /*
    * Update password, user must have a valid jwt token
    */
    server.route({
        method: 'PUT',
        path: '/auth/login',
        config: {
            auth: {
                strategy: 'token',
                scope: ['clusterpost']
            },
            validate: {
                query: false,
                payload: {
                    password: password
                },
                params: false
            },
            handler: handlers.loginUpdate,
            response: {
                schema: Joi.object().keys({
                    token: Joi.string().required()
                })
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/clusterauth/reset',
        config: {
            auth: false,
            validate: {
                query: false,
                payload: Joi.object().keys({
                    email: Joi.string().email().required()
                }),
                params: false
            },
            handler: handlers.resetPassword
        }
    });
}