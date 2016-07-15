exports.register = function (server, conf, next) {
  
  require('./dataprovider.routes')(server, conf);
  require('./executionserver.routes')(server, conf);
  require('./clusterprovider.methods')(server, conf);
  require('./cronprovider')(server, conf);

  if(!server.methods.cluster || server.methods.cluster && server.methods.cluster.getWorker().id === 1){
    server.methods.executionserver.startExecutionServers()
    .then(function(){
        console.log("Execution servers started.");
    });
  }

  return next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
