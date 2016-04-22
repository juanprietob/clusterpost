
module.exports = function (server, conf) {

    var handlers = require('./jwtauth.handlers')(server, conf);
    var Joi = require('joi');

    var joiuser = Joi.object().keys({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().regex(/^(?=.*[\d])(?=.*[A-Z])(?=.*[a-z])[\w\d!@#$%_-]{6,40}$/)
    });

    var joilogin = Joi.object().keys({
        email: Joi.string().email().required(),
        password: Joi.string().regex(/^(?=.*[\d])(?=.*[A-Z])(?=.*[a-z])[\w\d!@#$%_-]{6,40}$/)
    });

    server.auth.strategy('token', 'jwt', {
        key: conf.privateKey,
        validateFunc: handlers.validate,
        verifyOptions: { algorithms: [ 'HS256' ] }  // only allow HS256 algorithm
    });

    server.route({
        method: 'POST',
        path: '/clusterauth/user',
        config: {
            auth: false,
            handler: handlers.createUser,
            validate: {
                query: false,
                payload: joiuser,
                params: false
            },
            response: {
                schema: Joi.object().keys({
                    token: Joi.string().required()
                })
            }
        }
    });

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

    server.route({
        method: 'POST',
        path: '/clusterauth/login',
        config: {
            auth: false,
            validate: {
                query: false,
                payload: joilogin,
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


}