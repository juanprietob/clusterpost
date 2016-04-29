var clusterpostserver = require('clusterpost-server');

clusterpostserver.server.start(function () {
    clusterpostserver.server.log('info', 'Server running at: ' + clusterpostserver.server.info.uri);
});