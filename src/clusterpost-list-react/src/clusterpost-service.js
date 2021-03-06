import _ from 'underscore';

export default class ClusterpostService{

  constructor(){
    this.http = {};
  }

  setHttp(http){
    this.http = http;
  }

  getExecutionServers() {
    return this.http({
      method: 'GET',
      url: '/executionserver'
    });
  }

  getJobStatus(id) {
    return this.http({
      method: 'GET',
      url: '/executionserver/' + id       
    });
  }

  submitJob(id,force) {
    return this.http({
      method: 'POST',
      url: '/executionserver/' + id,
      data: {
          force: force
        }
    });
  }

  killJob(id) {
    return this.http({
      method: 'DELETE',
      url: '/executionserver/' + id
      
    });
  }

  createJob(job){
    return this.http({
      method: 'POST',
      url: '/dataprovider',
      data: job
      
    });
  }

  getAllJobs(executable){
    return this.http({
      method: 'GET',
      url: '/dataprovider',
      params: {
        executable: executable
      }
    });
  }

  updateJob(job){
  	return this.http({
      method: 'PUT',
      url: '/dataprovider',
      data: job
      
    });
  }

  getJobCount(i) {
    return this.http({
      method: 'GET',
      url: '/dataprovider/count'
    });
  }

  getJob(id){
  	return this.http({
      method: 'GET',
      url: '/dataprovider/' + id        
    });
  }

  getJobDownload(id){
    return this.http({
      method: 'GET',
      url: '/dataprovider/download/job/' + id, 
      responseType: 'blob'
    });
  }

  //For the response type check https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType, "text", "arraybuffer", "blob", "json"
  getAttachment(id, filename, responseType){
  	return this.http({
      method: 'GET',
      url: '/dataprovider/' + id + '/' + encodeURIComponent(filename),
      responseType: responseType
    });
  }

  getAttachmentDowloadToken(id, filename, expires){
    return this.http({
      method: 'GET',
      url: '/dataprovider/download/' + id + '/' + encodeURIComponent(filename),
      params: {
        expires: expires
      }
    });
  }

  getDownloadAttachmentURL(id, filename){
    return this.getAttachmentDowloadToken(id, filename)
    .then(function(res){
      return '/dataprovider/download/' + res.data.token;
    });
  }

  addAttachment(id, filename, data){
  	return this.http({
      method: 'PUT',
      url: '/dataprovider/' + id + '/' + filename,
      data: data
      
    });
  }

  addAttachments(id, filenameArray, dataArray){
    var service = this;
    var addAttachmentsRec = function(id, filenameArray, dataArray, index, resArray){
      return service.addAttachment(id, filenameArray[index], dataArray[index])
      .then(function (res) {
        resArray.push(res);
        index++;
        if(index < filenameArray.length && index < dataArray.length){            
          return addAttachmentsRec(id, filenameArray, dataArray, index, resArray);
        }
        return resArray; 
      })
    }
    return addAttachmentsRec(id, filenameArray, dataArray, 0, []);
  }

  getJobUser(email, jobstatus, executable){
  	return this.http({
      method: 'GET',
      url: '/dataprovider/user',
      params: {
      	userEmail: email, 
      	jobstatus: jobstatus,
      	executable: executable
      }        
    });
  }

  getUserJobs(params){
    return this.http({
      method: 'GET',
      url: '/dataprovider/user',
      params: params        
    });
  }

  deleteJob(id){
     return this.http({
       method: 'DELETE',
       url: '/dataprovider/' + id
     })
  }

  createAndSubmitJob(job, filenameArray, dataArray){
    var service = this;


    if(job.executionserver){
      var executionserverPromise = Promise.resolve(job);
    }else{
      var executionserverPromise = service.getExecutionServers()
      .then((res)=>{
        job.executionserver = res.data[0].name;
        return job;
      })
    }

    return executionserverPromise
    .then((job)=>{
      return service.createJob(job)
      .then(function(res){
        var doc = res.data;
        var job_id = doc.id;
        if(filenameArray && dataArray){
          return service.addAttachments(job_id, filenameArray, dataArray)
          .then(function(res){          
            return service.submitJob(job_id);
          });  
        }else{
          return service.submitJob(job_id);
        }
      });
    })
  }

  getExecutionServerTokens(){
    return this.http({
       method: 'GET',
       url: '/executionserver/tokens'
     });
  }

  parseCLIFromString(cmd){
      var splitted_cmd = cmd.trim().split(" ");
      return this.parseCLI(splitted_cmd);
  }

  parseCLI(splitted_cmd){
      var executable = splitted_cmd[0];
      var parameters = _.map(splitted_cmd.splice(1), function(param){
          return param;
      });
      

      var job = {
          "executable": executable,
          "parameters": parameters,
          "outputs": [
              {
                  "type": "file",
                  "name": "stdout.out"
              },
              {
                  "type": "file",
                  "name": "stderr.err"
              }
          ],
          "type": "job"
      };
      
      return Promise.resolve(job);
  }

  uploadSoftware(software) {
  return this.http({
    method: 'POST',
    url: '/executionserver/uploadSoftware',
    data: software
  });
 }

 getSoftware() {
  return this.http({
    method: 'GET',
    url: '/executionserver/getSoftware',
  });
 }

 deleteSoftware(software) {
  return this.http({
    method: 'DELETE',
    url: '/executionserver/deleteSoftware',
    data: software
  });
 }
}