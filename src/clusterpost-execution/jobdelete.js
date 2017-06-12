
var fs = require('fs');
var path = require('path');

module.exports = function(jobid, conf, doc){

    var executionmethods = require('./executionserver.methods')(conf);

    var promdoc; 

    if(doc){
        promdoc = Promise.resolve(doc);
    }else{
        promdoc = executionmethods.getDocument(jobid)
        .catch(function(err){
            console.error("Job not found before delete.", jobid)
        });
    }

    return promdoc
    .then(function(doc){        
        return require(path.join(__dirname, "jobkill"))(doc, conf);
    })
    .then(function(){
        var cwd = path.join(conf.storagedir, jobid);
    
        try{
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
        }catch(e){
            return {
                error: e
            }
        }
        

        return {
            status: "Folder deleted " + jobid
        }
    });
        
    
}