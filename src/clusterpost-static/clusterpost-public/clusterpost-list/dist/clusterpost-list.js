/*!
 * jsonformatter
 * 
 * Version: 0.6.0 - 2016-04-28T02:57:03.650Z
 * License: Apache-2.0
 */
"use strict";angular.module("jsonFormatter",["RecursionHelper"]).provider("JSONFormatterConfig",function(){var n=!1,e=100,t=5;return{get hoverPreviewEnabled(){return n},set hoverPreviewEnabled(e){n=!!e},get hoverPreviewArrayCount(){return e},set hoverPreviewArrayCount(n){e=parseInt(n,10)},get hoverPreviewFieldCount(){return t},set hoverPreviewFieldCount(n){t=parseInt(n,10)},$get:function(){return{hoverPreviewEnabled:n,hoverPreviewArrayCount:e,hoverPreviewFieldCount:t}}}}).directive("jsonFormatter",["RecursionHelper","JSONFormatterConfig",function(n,e){function t(n){return n.replace('"','"')}function r(n){if(void 0===n)return"";if(null===n)return"Object";if("object"==typeof n&&!n.constructor)return"Object";var e=/function (.{1,})\(/,t=e.exec(n.constructor.toString());return t&&t.length>1?t[1]:""}function o(n){return null===n?"null":typeof n}function s(n,e){var r=o(n);return"null"===r||"undefined"===r?r:("string"===r&&(e='"'+t(e)+'"'),"function"===r?n.toString().replace(/[\r\n]/g,"").replace(/\{.*\}/,"")+"{…}":e)}function i(n){var e="";return angular.isObject(n)?(e=r(n),angular.isArray(n)&&(e+="["+n.length+"]")):e=s(n,n),e}function a(n){n.isArray=function(){return angular.isArray(n.json)},n.isObject=function(){return angular.isObject(n.json)},n.getKeys=function(){return n.isObject()?Object.keys(n.json).map(function(n){return""===n?'""':n}):void 0},n.type=o(n.json),n.hasKey="undefined"!=typeof n.key,n.getConstructorName=function(){return r(n.json)},"string"===n.type&&("Invalid Date"!==new Date(n.json).toString()&&(n.isDate=!0),0===n.json.indexOf("http")&&(n.isUrl=!0)),n.isEmptyObject=function(){return n.getKeys()&&!n.getKeys().length&&n.isOpen&&!n.isArray()},n.isOpen=!!n.open,n.toggleOpen=function(){n.isOpen=!n.isOpen},n.childrenOpen=function(){return n.open>1?n.open-1:0},n.openLink=function(e){e&&(window.location.href=n.json)},n.parseValue=function(e){return s(n.json,e)},n.showThumbnail=function(){return!!e.hoverPreviewEnabled&&n.isObject()&&!n.isOpen},n.getThumbnail=function(){if(n.isArray())return n.json.length>e.hoverPreviewArrayCount?"Array["+n.json.length+"]":"["+n.json.map(i).join(", ")+"]";var t=n.getKeys(),r=t.slice(0,e.hoverPreviewFieldCount),o=r.map(function(e){return e+":"+i(n.json[e])}),s=t.length>=5?"…":"";return"{"+o.join(", ")+s+"}"}}return{templateUrl:"json-formatter.html",restrict:"E",replace:!0,scope:{json:"=",key:"=",open:"="},compile:function(e){return n.compile(e,a)}}}]),"object"==typeof module&&(module.exports="jsonFormatter"),angular.module("RecursionHelper",[]).factory("RecursionHelper",["$compile",function(n){return{compile:function(e,t){angular.isFunction(t)&&(t={post:t});var r,o=e.contents().remove();return{pre:t&&t.pre?t.pre:null,post:function(e,s){r||(r=n(o)),r(e,function(n){s.append(n)}),t&&t.post&&t.post.apply(null,arguments)}}}}}]),angular.module("jsonFormatter").run(["$templateCache",function(n){n.put("json-formatter.html",'<div ng-init="isOpen = open && open > 0" class="json-formatter-row"><a ng-click="toggleOpen()"><span class="toggler {{isOpen ? \'open\' : \'\'}}" ng-if="isObject()"></span> <span class="key" ng-if="hasKey"><span class="key-text">{{key}}</span><span class="colon">:</span></span> <span class="value"><span ng-if="isObject()"><span class="constructor-name">{{getConstructorName(json)}}</span> <span ng-if="isArray()"><span class="bracket">[</span><span class="number">{{json.length}}</span><span class="bracket">]</span></span></span> <span ng-if="!isObject()" ng-click="openLink(isUrl)" class="{{type}}" ng-class="{date: isDate, url: isUrl}">{{parseValue(json)}}</span></span> <span ng-if="showThumbnail()" class="thumbnail-text">{{getThumbnail()}}</span></a><div class="children" ng-if="getKeys().length && isOpen"><json-formatter ng-repeat="key in getKeys() track by $index" json="json[key]" key="key" open="childrenOpen()"></json-formatter></div><div class="children empty object" ng-if="isEmptyObject()"></div><div class="children empty array" ng-if="getKeys() && !getKeys().length && isOpen && isArray()"></div></div>')}]);
angular.module('clusterpost-list', 
['ui.bootstrap',
  'smart-table',
  'jsonFormatter',
  'jwt-user-login']);
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

angular.module('clusterpost-list')
.directive('clusterpostJobs', function($routeParams,$location, clusterpostService, $filter, $q, clusterauth){

	function link($scope,$attrs){
		

		$scope.jobs = {
			selectedJob: {}
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
		    	//delete job;
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

		$scope.numJobsInPage = [ {id: '0', value: '10'},
							      {id: '1', value: '50'},
							      {id: '2', value: '100'}];
		// $scope.itemsByPage = "10";
		$scope.rowCollection = [];
		$scope.getDB();
		$scope.forceRunJob = false;
		$scope.activeTab = 0;
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

angular.module('clusterpost-list').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('./src/clusterpost-list.directive.html',
    "<uib-tabset active=\"activeTab\">\n" +
    "	<uib-tab heading=\"Jobs\" index=\"0\">\n" +
    "		<table st-table=\"jobs.displayedJobs\" st-safe-src=\"jobs.data\" class=\"table table-striped\" on-filter=\"jobs.onFilter\">\n" +
    "				<thead>\n" +
    "				<tr>\n" +
    "					<th colspan=\"6\"><input st-search=\"\" class=\"form-control\" placeholder=\"Global search ...\" type=\"text\"/></th>\n" +
    "					<th colspan=\"5\">Number of jobs per page \n" +
    "						<select class=\"form-control\" ng-model=\"itemsByPage\" ng-options=\"option.value for option in numJobsInPage track by option.id\"></select>\n" +
    "					</th>\n" +
    "				</tr>\n" +
    "				<tr>\n" +
    "					<th st-sort=\"_id\"> Id </th>\n" +
    "					<th st-sort=\"userEmail\">User email</th>\n" +
    "					<th st-sort=\"timestamp\">Timestamp</th>\n" +
    "					<th st-sort=\"jobsstatus.status\">Job status</th>\n" +
    "					<th st-sort=\"row.executable\"> Executable </th>\n" +
    "					<th st-sort=\"jobstatus.jobid\">Job Id</th>\n" +
    "					<th>Update</th>\n" +
    "					<th>Run</th>\n" +
    "					<th>Force run</th>\n" +
    "					<th>Kill</th>\n" +
    "					<th>Delete</th>\n" +
    "				</tr>\n" +
    "				<tr>\n" +
    "					<th>\n" +
    "						<input st-search=\"_id\" placeholder=\"search for id\" class=\"input-sm form-control\" type=\"search\"/>\n" +
    "					</th>\n" +
    "					<th>\n" +
    "						<input st-search=\"userEmail\" placeholder=\"search for userEmail\" class=\"input-sm form-control\" type=\"search\"/>\n" +
    "					</th>\n" +
    "					<th>\n" +
    "						<input st-search=\"timestamp\" placeholder=\"search for timestamp\" class=\"input-sm form-control\" type=\"search\"/>\n" +
    "					</th>\n" +
    "					<th> \n" +
    "						<select class=\"form-control\" st-search=\"jobstatus.status\">\n" +
    "	                    	<option value=\"\">All</option>\n" +
    "	                    	<option ng-repeat=\"st in jobs.status\">{{st}}</option>\n" +
    "	                	</select>\n" +
    "					</th>\n" +
    "					<th>\n" +
    "						<select class=\"form-control\" st-search=\"executable\">\n" +
    "	                    	<option value=\"\">All</option>\n" +
    "	                    	<option ng-repeat=\"ex in jobs.executables\">{{ex}}</option>\n" +
    "	                	</select>\n" +
    "					</th>\n" +
    "					<th>\n" +
    "					</th>\n" +
    "					<th>\n" +
    "						<button type=\"button\" ng-click=\"updateAllJobs()\" class=\"btn btn-sm btn-info\">\n" +
    "						<i class=\"glyphicon glyphicon-refresh\">\n" +
    "							</i>\n" +
    "						</button>\n" +
    "					</th>\n" +
    "					<th>\n" +
    "						<button type=\"button\" ng-click=\"runAllJobs()\" class=\"btn btn-sm btn-success\">\n" +
    "						<i class=\"glyphicon glyphicon-play\">\n" +
    "							</i>\n" +
    "						</button>\n" +
    "					</th>\n" +
    "					<th>\n" +
    "					</th>\n" +
    "					<th>\n" +
    "					</th>\n" +
    "					<th>\n" +
    "						<button type=\"button\" ng-click=\"deleteAllJobs()\" class=\"btn btn-sm btn-danger\">\n" +
    "						<i class=\"glyphicon glyphicon-trash\">\n" +
    "							</i>\n" +
    "						</button>\n" +
    "					</th>\n" +
    "\n" +
    "				</tr>\n" +
    "				</thead>\n" +
    "				<tbody>\n" +
    "				<tr ng-repeat=\"row in jobs.displayedJobs\">\n" +
    "					<td><button class=\"btn btn-default\" ng-click=\"showJobDetail(row)\">{{row._id}}</button></td>\n" +
    "					<td>{{row.userEmail}}</td>\n" +
    "					<td>{{row.timestamp}}</td>\n" +
    "					<td>{{row.jobstatus.status}}</td>\n" +
    "					<td>{{row.executable}}</td>\n" +
    "					<td>{{row.jobstatus.jobid}}</td>\n" +
    "					<td>\n" +
    "						<button type=\"button\" ng-click=\"updateStatus(row)\" class=\"btn btn-sm btn-info\">\n" +
    "							<i class=\"glyphicon glyphicon-refresh\">\n" +
    "							</i>\n" +
    "						</button>\n" +
    "					</td>\n" +
    "					<td>\n" +
    "						<button type=\"button\" ng-click=\"runJob(row,forceRunJob)\" class=\"btn btn-sm btn-success\">\n" +
    "						<i class=\"glyphicon glyphicon-play\">\n" +
    "							</i>\n" +
    "						</button>\n" +
    "					</td>\n" +
    "					<td>\n" +
    "						<input type=\"checkbox\" ng-model=\"forceRunJob\"/>\n" +
    "					</td>\n" +
    "					<td>\n" +
    "						<button type=\"button\" ng-click=\"killJob(row)\" class=\"btn btn-sm btn-warning\">\n" +
    "							<i class=\"glyphicon glyphicon-remove-circle\">\n" +
    "							</i>\n" +
    "						</button>\n" +
    "					</td>\n" +
    "					<td>\n" +
    "						<button type=\"button\" ng-click=\"deleteJob(row)\" class=\"btn btn-sm btn-danger\">\n" +
    "							<i class=\"glyphicon glyphicon-trash\">\n" +
    "							</i>\n" +
    "						</button>\n" +
    "					</td>\n" +
    "				</tr>\n" +
    "				</tbody>\n" +
    "				<tfoot>\n" +
    "				<tr>\n" +
    "					<td colspan=\"10\" class=\"text-center\">\n" +
    "						<div st-pagination=\"\" st-items-by-page=\"itemsByPage.value\" st-displayed-pages=\"7\"></div>\n" +
    "					</td>\n" +
    "				</tr>\n" +
    "			</tfoot>\n" +
    "		</table>\n" +
    "	</uib-tab>\n" +
    "	<uib-tab heading=\"Job detail\" index=\"1\">\n" +
    "		<div class=\"col-md-12\">\n" +
    "			<div class=\"col-md-6 alert alert-info\" role=\"alert\">\n" +
    "				{{jobs.selectedJob.stdout}}\n" +
    "			</div>\n" +
    "			<div class=\"col-md-6 alert alert-warning\" role=\"alert\">\n" +
    "			  	{{jobs.selectedJob.stderr}}\n" +
    "			</div>\n" +
    "		</div>\n" +
    "		<div class=\"col-md-12\">\n" +
    "  			<json-formatter json=\"jobs.selectedJob.job\" open=\"4\"></json-formatter>\n" +
    "  		</div>\n" +
    "	</uib-tab>\n" +
    "</uib-tabset>\n" +
    " "
  );

}]);
