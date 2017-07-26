
angular.module('clusterpost')
.controller('clusterpostHome', function($scope, $http, clusterauth) {

	$scope.user = {};
	$scope._ = _;

	clusterauth.getUser()
	.then(function(user){
		$scope.user = user;
	})

});

