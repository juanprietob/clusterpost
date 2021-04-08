

var _ = require('underscore');

module.exports = function(doc, force, conf){
    
    var executionmethods = require('./executionserver.methods')(conf);
    var clusterengine = require("./" + conf.engine)(conf);

    var cwd = executionmethods.createDirectoryCWD(doc);
    executionmethods.createOutputDirs(doc);

    const submitJob = function(subdoc){        
        return executionmethods.getAllDocumentInputs(subdoc, cwd)
            .bind({})
            .then(function(downloadstatus){                
                this.downloadstatus = downloadstatus;
                var isago = true;
                for(var i = 0; i < downloadstatus.length; i++){
                    if(!downloadstatus[i].status){
                        isago = false;
                    }
                }
                if(isago){
                    subdoc.timestampstart = new Date();     
                    return clusterengine.submitJob(subdoc, cwd)
                    .catch(function(e){
                        return e;
                    });
                }
                return {
                    status: "DOWNLOADING",
                    error: 'Unable to retrieve all the input data'
                }
                
            })
            .then(function(jobstatus){
                if(conf.run_only){
                    subdoc.jobstatus.status = jobstatus.status
                    return executionmethods.uploadDocumentDataProvider(subdoc);
                }else{
                    subdoc.jobstatus = jobstatus;
                    _.extend(subdoc.jobstatus, this);                
                    return executionmethods.uploadDocumentDataProvider(subdoc);        
                }
            });

    }

    var sjprom;
    
    if (doc.jobstatus.status === 'CREATE' || doc.jobstatus.status === 'QUEUE' || doc.jobstatus.status === 'DOWNLOADING' || doc.jobstatus.status === 'FAIL'){
        sjprom = submitJob(doc);        
    } else {
        sjprom = clusterengine.getJobStatus(doc)
        .then(function(status){
            if(status.status !== 'RUN' && force){
                if(doc.jobstatus.uploadstatus){
                    delete doc.jobstatus.uploadstatus;
                }
                return submitJob(doc);
            }
            doc.jobstatus = status;
            if(!conf.run_only){
                return executionmethods.uploadDocumentDataProvider(doc);
            }
            else{
                console.log(status);
            }
        })
        .catch(function(e){
            console.error(e);
            return e;
        });
    }

    return sjprom;
}
