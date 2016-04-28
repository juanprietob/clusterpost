
module.exports = function (server, conf) {

    var handlers = require('./jwtauth.handlers')(server, conf);
    var Joi = require('joi');

    var clustermodel = require('../clustermodel');

    server.auth.strategy('token', 'jwt', {
        key: conf.privateKey,
        validateFunc: handlers.validate,
        verifyOptions: conf.algorithms  // only allow HS256 algorithm
    });

    /*
    *   Create user in DB. 
    */
    server.route({
        method: 'POST',
        path: '/clusterauth/user',
        config: {
            auth: false,
            handler: handlers.createUser,
            validate: {
                query: false,
                payload: clustermodel.user,
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
    *   Delete user from DB
    */
    server.route({
        method: 'DELETE',
        path: '/clusterauth/user',
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
        path: '/clusterauth/login',
        config: {
            auth: false,
            validate: {
                query: false,
                payload: clustermodel.login,
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
        path: '/clusterauth/login',
        config: {
            auth: {
                strategy: 'token',
                scope: ['clusterpost']
            },
            validate: {
                query: false,
                payload: clustermodel.login,
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