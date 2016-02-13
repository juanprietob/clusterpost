var Hapi = require('hapi');
var fs = require('fs');
var good = require('good');

var env = process.env.NODE_ENV;

if(!env) throw "Please set NODE_ENV variable.";

var server = new Hapi.Server();

const getConfigFile = function (env, base_directory) {
  try {
    // Try to load the user's personal configuration file
    return require(base_directory + '/conf.my.' + env + '.json');
  } catch (e) {
    // Else, read the default configuration file
    return require(base_directory + '/conf.' + env + '.json');
  }
};

server.method({
    name: 'getConfigFile',
    method: getConfigFile,
    options: {}
});

var conf = server.methods.getConfigFile(env, "./")

server.connection({ 
    host: conf.host,
    port: conf.port
});

var plugins = [];

Object.keys(conf.plugins).forEach(function(pluginName){
    var plugin = {};
    plugin.register = require(pluginName);
    plugin.options = conf.plugins[pluginName];
    plugins.push(plugin);
});

plugins.push({
    register: good,
    options: {
        reporters: [
        {
            reporter: require('good-console'),
            events: { log: '*', response: '*' }
        }, {
            reporter: require('good-file'),
            events: { ops: '*' },
            config: 'all.log'
        }]
    }
});


server.register(plugins, function(err){
    if (err) {
        throw err; // something bad happened loading the plugin
    }

    server.start(function () {
        server.log('info', 'Server running at: ' + server.info.uri);
    });
});