module.exports = function(grunt) {
    var name = 'clusterpost-list';
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        run_grunt: {
            prod: {
                options: {
                    log: false,
                    process: function(res){
                        if (res.fail){
                            console.error(res);
                        }
                    }
                },
                src: ['node_modules/clusterpost-list/Gruntfile.js']
            },
            dev: {
                options: {
                    log: true,
                    process: function(res){
                        if (res.fail){
                            console.error(res);
                        }
                    },
                    debugCli: true,
                    task: ['dev']
                },
                src: ['node_modules/clusterpost-list/Gruntfile.js']
            },
        },
        watch: {
            options: {
                livereload: {
                  port: 9000
                }
            },
            html: {
                files: ['node_modules/clusterpost-list/src/*.html'],
                tasks: ['run_grunt:dev']
            },
            css: {
                files: ['node_modules/clusterpost-list/src/*.css'],
                tasks: ['run_grunt:dev']
            },
            js: {
                files: ['node_modules/clusterpost-list/src/*.js', '!node_modules/clusterpost-list/**/*.min.js'],
                tasks: ['run_grunt:dev']
            },
        }
    });

    //load grunt tasks
    grunt.loadNpmTasks('grunt-run-grunt');
    grunt.loadNpmTasks('grunt-contrib-watch');


    //register grunt default task
    grunt.registerTask('default', [ 'run_grunt:prod']);
    //register dev task
    grunt.registerTask('dev', [ 'run_grunt:dev', 'watch']);
}