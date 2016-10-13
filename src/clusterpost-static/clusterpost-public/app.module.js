'use strict';

// Declare app level module which depends on views, and components
angular.module('clusterpost', [
  'ngRoute',
  'clusterpost-list'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider
  .when('/', {
    redirectTo: '/login'
  })
  .when('/login', {
    templateUrl: 'login/login.html'
  })
  .when('/home', {
    templateUrl: 'home/home.template.html'
  })
  .when('/login/reset', {
    templateUrl: 'login.html'
  })
  .when('/users', {
    templateUrl: 'bower_components/users-manager/usersManager.template.html'
  })
  .when('/notFound', {
    templateUrl: 'notFound.html'
  })
  .otherwise({redirectTo: '/home'});
}]);
