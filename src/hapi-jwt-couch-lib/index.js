
var fs = require('fs');
var path = require('path');
var qs = require('querystring');
var os = require('os');

var request = require('request');
var Promise = require('bluebird');
var _ = require('underscore');
var prompt = require('prompt');
var jws = require('jsonwebtoken');

var hapijwtcouch = {};

hapijwtcouch.auth = {};

hapijwtcouch.getAuth = function(){
    return hapijwtcouch.auth;
}

hapijwtcouch.setServer = function(uri){
    if(_.isObject(uri)){
        _.extend(hapijwtcouch, uri);
    }else{
        hapijwtcouch.uri = uri;
    }
}

hapijwtcouch.setServerUri = hapijwtcouch.setServer;

hapijwtcouch.getServer = function(){
    return hapijwtcouch.uri 
}

hapijwtcouch.agentOptions = {};

hapijwtcouch.setAgentOptions = function(agentOptions){
    hapijwtcouch.agentOptions = agentOptions;
}

hapijwtcouch.promptUsernamePassword = function(){
    return new Promise(function(resolve, reject){
        var schema = {
            properties: {
                email: {
                    pattern: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                    message: 'Email address',
                    required: true
                },
                password: {                    
                    hidden: true,
                    required: true
                }
            }
        };        
        prompt.get(schema, function (err, result) {
            if(err){
                reject(err)
            }else{
                resolve(result);
            }
        });
    });
}

hapijwtcouch.promptServer = function(){
    return new Promise(function(resolve, reject){
        var schema = {
            properties: {
                uri: {
                    message: 'Please enter the server uri',
                    required: true
                }
            }
        };        
        prompt.get(schema, function (err, result) {
            if(err){
                reject(err)
            }else{
                resolve(result);
            }
        });
    });
}

hapijwtcouch.start = function(){
    return hapijwtcouch.promptServer()
    .then(function(server){
        hapijwtcouch.setServer(server);
        return hapijwtcouch.promptUsernamePassword()
    })
    .then(function(user){
        return hapijwtcouch.userLogin(user);
    })
}

hapijwtcouch.testUserToken = function(token){
    var jwt = jws.decode(token.token);

    if(jwt.exp && jwt.exp < Date.now() / 1000){
        return false;
    }else if(jwt.exp === undefined){
        console.log("WARNING! The token does not have an expiry date. Tokens without expiry date were deprecated. The server could be running an old version. Please contact the server administrator.");
    }
    return true;
}

hapijwtcouch.setUserToken = function(token){
    if(_.isObject(token)){
        if(token.token){
            hapijwtcouch.auth.bearer = token.token;
        }else{
            console.error("hapijwtcouch.setUserToken: ", JSON.stringify(token));
            throw "Invalid token set for auth mechanism, must be an object {'token': 'someAuthToken'}";
        }
    }else{
        hapijwtcouch.auth.bearer = token;
    }
}

hapijwtcouch.getUserToken = function(){
    return hapijwtcouch.auth.bearer;
}


//Here the implementation of different functions starts

hapijwtcouch.createUser = function(user){
    return new Promise(function(resolve, reject){
        var options = {
            url: hapijwtcouch.getServer() + "/auth/user",
            method: 'POST',
            json: user,
            agentOptions: hapijwtcouch.agentOptions
        }

        request(options, function(err, res, body){
            if(err){
                reject(err);
            }else{
                resolve(body);
            }
        });
    });
}

hapijwtcouch.resetPassword = function(user){
    return new Promise(function(resolve, reject){
        var options = {
            url: hapijwtcouch.getServer() + "/auth/reset",
            method: 'POST',
            json: user,
            agentOptions: hapijwtcouch.agentOptions
        }

        request(options, function(err, res, body){
            if(err){
                reject(err);
            }else{
                resolve(body);
            }
        });
    });
}

hapijwtcouch.userLogin = function(user){
    return new Promise(function(resolve, reject){
        var options = {
            url: hapijwtcouch.getServer() + "/auth/login",
            method: 'POST',
            json: user,
            agentOptions: hapijwtcouch.agentOptions
        }

        request(options, function(err, res, body){
            if(err){
                reject(err);
            }else{
                hapijwtcouch.auth.bearer = body.token
                resolve(body);
            }
        });
    });
}

hapijwtcouch.getUser = function(){
    return new Promise(function(resolve, reject){
        var options = {
            url: hapijwtcouch.getServer() + "/auth/user",
            method: 'GET',
            auth: hapijwtcouch.auth,
            agentOptions: hapijwtcouch.agentOptions
        }

        request(options, function(err, res, body){
            if(err){
                reject(err);
            }else{                
                resolve(JSON.parse(body));
            }
        });
    });
}

hapijwtcouch.getUsers = function(){
    return new Promise(function(resolve, reject){
        var options = {
            url: hapijwtcouch.getServer() + "/auth/users",
            method: 'GET',
            auth: hapijwtcouch.auth,
            agentOptions: hapijwtcouch.agentOptions
        }

        request(options, function(err, res, body){
            if(err){
                reject(err);
            }else{
                resolve(body);
            }
        });
    });
}

hapijwtcouch.updateUser = function(userinfo){

    return new Promise(function(resolve, reject){
        var options = {
            url: hapijwtcouch.getServer() + "/auth/user",
            method: 'PUT',
            json: userinfo,
            auth: hapijwtcouch.auth,
            agentOptions: hapijwtcouch.agentOptions
        }

        request(options, function(err, res, body){
            if(err){
                reject(err);
            }else{
                resolve(body);
            }
        });
    });
}

hapijwtcouch.updateUsers = function(userinfo){

    return new Promise(function(resolve, reject){
        var options = {
            url: hapijwtcouch.getServer() + "/auth/users",
            method: 'PUT',
            json: userinfo,
            auth: hapijwtcouch.auth,
            agentOptions: hapijwtcouch.agentOptions
        }

        request(options, function(err, res, body){
            if(err){
                reject(err);
            }else{
                resolve(body);
            }
        });
    });
}

hapijwtcouch.deleteUser = function(){
    return new Promise(function(resolve, reject){
        var options = {
            url: hapijwtcouch.getServer() + "/auth/user",
            method: 'DELETE',
            agentOptions: hapijwtcouch.agentOptions,
            auth: hapijwtcouch.auth
        }

        request(options, function(err, res, body){
            if(err){
                reject(err);
            }else{
                resolve(body);
            }
        });
    });
}

hapijwtcouch.deleteUsers = function(user){
    return new Promise(function(resolve, reject){
        var options = {
            url: hapijwtcouch.getServer() + "/auth/users",
            method: 'DELETE',
            agentOptions: hapijwtcouch.agentOptions,
            auth: hapijwtcouch.auth,
            json: user
        }

        request(options, function(err, res, body){
            if(err){
                reject(err);
            }else{
                resolve(body);
            }
        });
    });
}
_.extend(exports, hapijwtcouch);