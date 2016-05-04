exports.register = function (server, conf, next) {
  
  require('./jwtauth.routes')(server, conf);

  return next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};