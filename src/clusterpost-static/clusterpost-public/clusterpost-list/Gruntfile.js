module.exports = function(grunt) {
    var name = 'clusterpost-list';
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        ngtemplates: {
            'clusterpost-list': {
                src: './src/**.html',
                dest: './src/clusterpost-list.templates.js'
            }
        },
        ngAnnotate: {
		    options: {
		        singleQuotes: true
		    },
            app: {
                files: {
                    './src/clusterpost-list.module.minified.js': ['./src/clusterpost-list.module.js'],
                    './src/clusterpost-list.service.minified.js': ['./src/clusterpost-list.service.js'],
                    './src/clusterpost-list.directive.minified.js': ['./src/clusterpost-list.directive.js'],
                    './src/clusterpost-list.templates.minified.js': ['./src/clusterpost-list.templates.js']
                }
            }
		},
		concat: {
    		js: { //target
        		src: ['./node_modules/jsonformatter/dist/json-formatter.min.js', './src/clusterpost-list.module.minified.js', './src/clusterpost-list.service.minified.js', './src/clusterpost-list.directive.minified.js', './src/clusterpost-list.templates.minified.js'],
        		dest: './dist/clusterpost-list.min.js'
    		},
            dev: {
                src: ['./node_modules/jsonformatter/dist/json-formatter.min.js', './src/clusterpost-list.module.js', './src/clusterpost-list.service.js', './src/clusterpost-list.directive.js', './src/clusterpost-list.templates.js'],
                dest: './dist/clusterpost-list.js',
            },
		},
		uglify: {
    		js: { //target
        		src: ['./dist/clusterpost-list.min.js'],
        		dest: './dist/clusterpost-list.min.js'
    		}
		},
        clean: ['./src/*.minified.js', './src/clusterpost-list.templates.js']   
    });

    //load grunt tasks
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-ng-annotate'); 
    grunt.loadNpmTasks('grunt-angular-templates');


    //register grunt default task
    grunt.registerTask('default', [ 'ngtemplates', 'ngAnnotate', 'concat', 'uglify','clean']);
}