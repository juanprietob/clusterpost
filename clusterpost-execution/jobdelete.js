
var fs = require('fs');
var path = require('path');

module.exports = function(jobid, conf){

    var executionmethods = require('./executionserver.methods')(conf);

    var cwd = path.join(conf.storagedir, jobid);
    
    executionmethods.deleteFolderRecursive(cwd);
    var compressed = cwd + ".tar.gz";
    var compressedstat;
    try{
        compressedstat = fs.statSync(compressed);
    }catch(e){
        //does not exist
        compressedstat = undefined;
    }
    if(compressedstat){
        fs.unlinkSync(compressed);
    }
        
    
}