
angular.module('clusterpost-list')
.directive('clusterpostJobs', function($routeParams,$location, clusterpostService, $filter, $q, clusterauth){

	function link($scope,$attrs){
		

		$scope.jobs = {
			selectedJob: {
				job: {}
			}, 
			edit: {
				show: false
			}
		};

		$scope.jobs.onFilter = function(filtered){
			$scope.jobs.filteredJobs = filtered;
		}

		$scope.updateStatus = function(job){
		    clusterpostService.getJobStatus(job._id).then(function(res){
	           job.jobstatus = res.data;
	        })
	        .catch(function(e){
	          console.error(e);
	          throw e;
	        })
	    }

	    $scope.killJob = function(job){

		    clusterpostService.killJob(job._id).then(function(res){
	           job.jobstatus = res.data;
	        })
	        .catch(function(e){
	          console.error(e);
	          throw e;
	        })
	    }
	    $scope.removeRow = function(job) {
	        var index = $scope.rowCollection.indexOf(job);
	        if (index !== -1) {
	            $scope.rowCollection.splice(index, 1);
	        }
    	}   

	   	$scope.deleteJob = function(job){

		    clusterpostService.deleteJob(job._id)
		    .then(function(res){
		    	for(var i = 0; i < $scope.jobs.data.length; i++){
		    		if($scope.jobs.data[i]._id === job._id){
		    			$scope.jobs.data.splice(i, 1);
		    		}
		    	}
	        })
	        .catch(function(e){
	          console.error(e);
	          throw e;
	        });
	    }
	    $scope.runJob = function(job,force){
			clusterpostService.submitJob(job._id,force).then(function(res){
				$scope.getDB();
			})
			.catch(function(e){
                console.error(e);
            });
		}

	    $scope.getDB = function(){
			clusterpostService.getAllJobs().then(function(res){
				$scope.jobs.data = res.data;
				$scope.jobs.status = _.uniq(_.pluck(_.pluck(res.data, 'jobstatus'), 'status'));
				$scope.jobs.executables = _.uniq(_.pluck(res.data, 'executable'));
			})
			.catch(function(e){
                console.error(e);
            });
		}

		$scope.showJobDetail = function(job){
			$scope.jobs.selectedJob.job = job;			
			$scope.activeTab = 1;
			clusterpostService.getAttachment(job._id, "stdout.out", "text")
			.then(function(res){
				$scope.jobs.selectedJob.stdout = res.data;
			})
			.catch(console.error);
			clusterpostService.getAttachment(job._id, "stderr.err", "text")
			.then(function(res){
				$scope.jobs.selectedJob.stderr = res.data;
			})
			.catch(console.error);
		}

		$scope.runAllJobs = function(){
			if($scope.jobs.filteredJobs){
				
				var prom = _.map($scope.jobs.filteredJobs, function(job){
					return clusterpostService.submitJob(job._id)
					.then(function(res){
						console.log(res);
					})
					.catch(console.error)
				});

				Promise.all(prom)
				.catch(console.error);
			}
		}

		$scope.updateAllJobs = function(){
			if($scope.jobs.filteredJobs){
				
				var prom = _.map($scope.jobs.filteredJobs, function(job){
					return clusterpostService.getJobStatus(job._id)
					.then(function(res){
						job.jobstatus = res.data;
					})
					.catch(console.error)
				});

				Promise.all(prom)
				.catch(console.error);
			}
		}

		$scope.deleteAllJobs = function(){
			if($scope.jobs.filteredJobs){
				
				var prom = _.map($scope.jobs.filteredJobs, $scope.deleteJob);

				Promise.all(prom)
				.catch(console.error);
			}
		}

		$scope.killAllJobs = function(){
			if($scope.jobs.filteredJobs){
				
				var prom = _.map($scope.jobs.filteredJobs, $scope.killJob);

				Promise.all(prom)
				.catch(console.error);
			}
		}

		$scope.saveJobEdit = function(){
			$scope.jobs.edit.showerror = false;			
			try{
				var job = JSON.parse($scope.jobs.edit.jobtext);
				clusterpostService.updateJob(job)
				.then(function(res){					
					$scope.jobs.edit.show = false;
					$scope.jobs.selectedJob.job = job;
					for(var i = 0; i < $scope.jobs.data.length; i++){
						if(job._id === $scope.jobs.data[i]._id){
							$scope.jobs.data[i] = job;
						}
					}
				})
				.catch(function(e){
					$scope.jobs.edit.error = e.message;
					$scope.jobs.edit.showerror = true;					
				})

			}catch(e){

				$scope.jobs.edit.error = e.message;
				$scope.jobs.edit.showerror = true;
			}
			
		}

		$scope.numJobsInPage = [ {id: '0', value: '10'},
							      {id: '1', value: '50'},
							      {id: '2', value: '100'}];
		// $scope.itemsByPage = "10";
		$scope.rowCollection = [];
		$scope.getDB();
		$scope.forceRunJob = false;
		$scope.activeTab = 0;

		$scope.$watch("jobs.edit.show", function(){
			if($scope.jobs.edit.show){
				$scope.jobs.edit.jobtext = JSON.stringify($scope.jobs.selectedJob.job, null, 4);
			}
		})
	}

	return {
	    restrict : 'E',
	    link : link,
	    templateUrl: './src/clusterpost-list.directive.html'
	}

});

angular.module('clusterpost-list')
.directive('onFilter', function () {
  return {
    require: '^stTable',
    scope: {
        onFilter: '='
    },
    link: function (scope, element, attr, ctrl) {
      scope.$watch(ctrl.getFilteredCollection, function(val) {
      	if(scope.onFilter){
      		scope.onFilter(val);
      	}
      });
    }
  }
});
