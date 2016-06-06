var clusterpostserver = require('clusterpost-server');


clusterpostserver.migrateUp()
.then(function(res){
    console.log(res);
    process.exit(0);
})
.catch(function(err){
    console.log(error);
    process.exit(1);
});


