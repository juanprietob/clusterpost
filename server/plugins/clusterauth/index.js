var jwt = require('jsonwebtoken');


var options;
exports.register = function (server, pluginOptions, next) {
  options = pluginOptions;

  var conf = server.methods.getConfigFile(options.env, './plugins/clusterauth');

  //require('./clusterprovider.methods')(server, conf);
  require('./jwtauth.routes')(server, conf);

  return next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};