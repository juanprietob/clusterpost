
var options;
exports.register = function (server, pluginOptions, next) {
  options = pluginOptions;

  var conf = server.methods.getConfigFile(options.env, './plugins/clusterprovider');

  require('./clusterprovider.methods')(server, conf);
  require('./dataprovider.routes')(server, conf);
  require('./executionserver.routes')(server, conf);

  return next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
