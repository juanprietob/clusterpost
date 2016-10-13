exports.register = function (server, conf, next) {
  
  require('./dataprovider.routes')(server, conf);
  require('./executionserver.routes')(server, conf);
  require('./clusterprovider.methods')(server, conf);
  require('./cronprovider')(server, conf);

  var cluster = server.methods.getCluster();
  if(!cluster || cluster && cluster.worker.id === 1){
    
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
