var Hapi = require('hapi');
var fs = require('fs');
var good = require('good');

var env = process.env.NODE_ENV;

if(!env) throw "Please set NODE_ENV variable.";


const getConfigFile = function () {
  try {
    // Try to load the user's personal configuration file
    return require(process.cwd() + '/conf.my.' + env + '.json');
  } catch (e) {
    // Else, read the default configuration file
    return require(process.cwd() + '/conf.' + env + '.json');
  }
}

var conf = getConfigFile();
var server = new Hapi.Server();

if(conf.tls && conf.tls.key && conf.tls.cert){
    const tls = {
      key: fs.readFileSync(conf.tls.key),
      cert: fs.readFileSync(conf.tls.cert)
    };
}

server.connection({ 
    host: conf.host,
    port: conf.port,
    tls: tls
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

    server.methods.executionserver.startExecutionServers()
    .then(function(){
        console.log("Execution servers started.");
        server.start(function () {
            server.log('info', 'Server running at: ' + server.info.uri);
        });
    });
});