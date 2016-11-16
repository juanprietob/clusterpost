
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

    var userinfo = Joi.object().keys({
        _id: Joi.string().alphanum().required(),
        _rev: Joi.string().required(),
        name: Joi.string().required(),
        email: Joi.string().email().required(), 
        scope: Joi.array().items(Joi.string()),
        password: Joi.forbidden(),
        type: Joi.string().valid('user').required()
    }).unknown();

    var scopes = Joi.object().keys({
        _id: Joi.string().alphanum().required(),
        _rev: Joi.string().required(),
        type: Joi.string().valid('scopes').required(),
        scopes: Joi.array().items(Joi.string()).required()
    });

    var scopespost = Joi.object().keys({
        type: Joi.string().valid('scopes').required(),
        scopes: Joi.array().items(Joi.string()).required()
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
            },
            description: 'Create new user, add it to the database with the password encrypted.'
        }
    });

    /*
    *   Get users
    */

    server.route({
        method: 'GET',
        path: '/auth/users',
        config: {
            auth: {
                strategy: 'token',
                scope: ['admin']
            },
            handler: handlers.getUsers,
            validate: {
                query: false,
                payload: false,
                params: false
            },
            response: {
                schema: Joi.array().items(userinfo)
            },
            description: 'Get all users information'
        }
    });

    /*
    *   Admin Deletes user from DB
    */
    server.route({
        method: 'DELETE',
        path: '/auth/users',
        config: {
            auth: {
                strategy: 'token',
                scope: ['admin']
            },
            handler: handlers.deleteUser,
            validate: {
                query: false,
                payload: userinfo,
                params: false
            },
            description: 'Admin deletes user from the db'
        }
    });

    /*
    *   Update user information
    */

    server.route({
        method: 'PUT',
        path: '/auth/users',
        config: {
            auth: {
                strategy: 'token',
                scope: ['admin']
            },
            handler: handlers.updateUser,
            validate: {
                query: false,
                payload: userinfo,
                params: false
            },
            response: {
                schema: Joi.object()
            },
            description: 'Admin update user'
        }
    });

    /*
    *   Update user information
    */

    server.route({
        method: 'PUT',
        path: '/auth/user',
        config: {
            auth: {
                strategy: 'token',
                scope: ['default']
            },
            handler: handlers.updateUser,
            validate: {
                query: false,
                payload: userinfo,
                params: false
            },
            response: {
                schema: Joi.object()
            },
            description: 'User updates itself'
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
                scope: ['default']
            },
            handler: handlers.getUser,
            validate: {
                query: false,
                payload: false,
                params: false
            },
            response: {
                schema: userinfo
            },
            description: 'Get user information'
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
                scope: ['default']
            },
            handler: handlers.deleteUser,
            validate: {
                query: false,
                payload: false,
                params: false
            },
            description: 'Delete user from the db'
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
                scope: ['default']
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
            },
            description: 'Update user password.'
        }
    });

    server.route({
        method: 'POST',
        path: '/auth/reset',
        config: {
            auth: false,
            validate: {
                query: false,
                payload: Joi.object().keys({
                    email: Joi.string().email().required()
                }),
                params: false
            },
            handler: handlers.resetPassword,
            description: 'Send user an email with a token. The token is valid for 30 min and it can be used to change the password.'
        }
    });

    /*
    *   Get scopes
    */

    server.route({
        method: 'GET',
        path: '/auth/scopes',
        config: {
            auth: {
                strategy: 'token',
                scope: ['admin']
            },
            handler: handlers.getScopes,
            validate: {
                query: false,
                payload: false,
                params: false
            },
            // response: {
            //     schema: Joi.array().items(scopes)
            // },
            description: 'Get all scopes'
        }
    });

    /*
    *   Update scopes
    */

    server.route({
        method: 'PUT',
        path: '/auth/scopes',
        config: {
            auth: {
                strategy: 'token',
                scope: ['default']
            },
            handler: handlers.updateScopes,
            validate: {
                query: false,
                payload: scopes,
                params: false
            },
            description: 'Update scope list'
        }
    });

    /*
    *   Create scopes
    */

    server.route({
        method: 'POST',
        path: '/auth/scopes',
        config: {
            auth: false,
            handler: handlers.createScopes,
            validate: {
                query: false,
                payload: scopespost,
                params: false
            },
            description: 'Create default scopes.'
        }
    });
}