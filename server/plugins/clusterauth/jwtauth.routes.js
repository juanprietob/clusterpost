
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
        path: '/clusterauth/createUser',
        config: {
            auth: false,
            validate: {
                query: false,
                payload: joiuser,
                params: false
            }
        },
        handler: handlers.createUser
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
            }
        },
        handler: handlers.login
    });

    // With scope requirements
    server.route({
        method: 'GET',
        path: '/withScope',
        config: {
            auth: {
                strategy: 'token',
                scope: ['a']
            }
        },
        handler: function(req, rep){
            console.log(req.auth)
            rep("AUTH token");
        }
    });


}