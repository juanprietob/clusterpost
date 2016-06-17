exports.register = function (server, conf, next) {
  
  require('./dataprovider.routes')(server, conf);
  require('./executionserver.routes')(server, conf);
  require('./clusterprovider.methods')(server, conf);
  require('./cronprovider')(server, conf);

  return next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
