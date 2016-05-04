exports.register = function (server, conf, next) {
  require('./clusterprovider.methods')(server, conf);
  require('./dataprovider.routes')(server, conf);
  require('./executionserver.routes')(server, conf);
  require('./cronprovider')(server, conf);

  return next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
