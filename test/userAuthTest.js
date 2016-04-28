
var request = require('request');
var fs = require('fs');
var Promise = require('bluebird');
var path = require('path');

const Joi = require('joi');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const clustermodel = require("clusterpost-model");

const getConfigFile = function (env, base_directory) {
  try {
    // Try to load the user's personal configuration file
    return require(base_directory + '/conf.my.' + env + '.json');
  } catch (e) {
    // Else, read the default configuration file
    return require(base_directory + '/conf.' + env + '.json');
  }
};


var env = process.env.NODE_ENV;

if(!env) throw "Please set NODE_ENV variable.";

var conf = getConfigFile(env, "./");

var agentOptions = {};

if(conf.tls && conf.tls.cert){
    agentOptions.ca = fs.readFileSync(conf.tls.cert);
}

var getClusterPostServer = function(){
    return conf.uri 
}

var joiokres = Joi.object().keys({
                ok: Joi.boolean().valid(true),
                id: Joi.string(),
                rev: Joi.string()
            });

var createUser = function(user){
    return new Promise(function(resolve, reject){
        var options = {
            url: getClusterPostServer() + "/clusterauth/user",
            method: 'POST',
            json: user,
            agentOptions: agentOptions
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

var userLogin = function(user){
    return new Promise(function(resolve, reject){
        var options = {
            url: getClusterPostServer() + "/clusterauth/login",
            method: 'POST',
            json: user,
            agentOptions: agentOptions
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

var deleteUser = function(token){
    return new Promise(function(resolve, reject){
        var options = {
            url: getClusterPostServer() + "/clusterauth/user",
            method: 'DELETE',
            agentOptions: agentOptions,
            headers: { authorization: token }
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

lab.experiment("Test clusterpost auth jwt", function(){

    var user = {
        email: "algiedi85@gmail.com",
        name: "Alpha Capricorni",
        password: "Some808Password!"
    }

    lab.test('returns true when new user is created.', function(){

        return createUser(user)
        .then(function(res){
            Joi.assert(res.token, Joi.string().required());
        });
        
    });

    lab.test('returns true if same user fails to be created.', function(){

        
        return createUser(user)
        .then(function(res){
            Joi.assert(res.token, Joi.object().keys({ 
                statusCode: Joi.number().valid(409),
                error: Joi.string(),
                message: Joi.string()
            }));
        });
    });

    var token = "";

    lab.test('returns true when user is login.', function(){

        var user = {
            email: "algiedi85@gmail.com",
            password: "Some808Password!"
        }

        return userLogin(user)
        .then(function(res){
            Joi.assert(res.token, Joi.string().required())
            token = "Bearer " + res.token;
        });
        
    });

    lab.test('returns true when unauthorized user access api.', function(){

        return deleteUser()
        .then(function(res){
            Joi.assert(res, Joi.object().keys({ 
                statusCode: Joi.number().valid(401),
                error: Joi.string(),
                message: Joi.string()
            }));
        });
        
    });

    lab.test('returns true when valid user deletes itself.', function(){

        return deleteUser(token)
        .then(function(res){
            Joi.assert(res, Joi.object().keys({ 
                ok: Joi.boolean(),
                id: Joi.string(),
                rev: Joi.string()
            }));
        });
        
    });

});