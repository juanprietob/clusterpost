angular.module('clusterpost-list')
.factory('clusterpostService', function ($q, $http, $location) {
  return {
    getExecutionServers: function () {
      return $http({
        method: 'GET',
        url: '/executionserver'
        
      });
    },
    getJobStatus: function (id) {
      return $http({
        method: 'GET',
        url: '/executionserver/' + id       
      });
    },
    submitJob: function (id,force) {
      return $http({
        method: 'POST',
        url: '/executionserver/' + id,
        data: {
            force: force
          }
      });
    },
    killJob: function (id) {
      return $http({
        method: 'DELETE',
        url: '/executionserver/' + id
        
      });
    },
    createJob: function(job){
      return $http({
        method: 'POST',
        url: '/dataprovider',
        data: job
        
      });
    },
    getAllJobs: function(executable){
      return $http({
        method: 'GET',
        url: '/dataprovider',
        params: {
          executable: executable
        }
      });
    },
    updateJob: function(job){
    	return $http({
        method: 'PUT',
        url: '/dataprovider',
        data: job
        
      });
    },
    getJob: function(id){
    	return $http({
        method: 'GET',
        url: '/dataprovider/' + id        
      });
    },
    //For the response type check https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType, "text", "arraybuffer", "blob", "json"
    getAttachment: function(id, filename, responseType){
    	return $http({
        method: 'GET',
        url: '/dataprovider/' + id + '/' + encodeURIComponent(filename),
        responseType: responseType
      });
    },
    addAttachment: function(id, filename, data){
    	return $http({
        method: 'PUT',
        url: '/dataprovider/' + id + '/' + filename,
        data: data
        
      });
    },
    getJobUser: function(email, jobstatus, executable){
    	return $http({
        method: 'GET',
        url: '/dataprovider/user',
        params: {
        	userEmail: email, 
        	jobstatus: jobstatus,
        	executable: executable
        }        
      });
    },
    deleteJob: function(id){
       return $http({
         method: 'DELETE',
         url: '/dataprovider/' + id
       })
    }
  }
});