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
                src: ['clusterpost-list/Gruntfile.js']
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
                src: ['clusterpost-list/Gruntfile.js']
            },
        },
        watch: {
            options: {
                livereload: {
                  port: 9000
                }
            },
            html: {
                files: ['./clusterpost-list/src/*.html'],
                tasks: ['run_grunt:dev']
            },
            css: {
                files: ['./clusterpost-list/src/*.css'],
                tasks: ['run_grunt:dev']
            },
            js: {
                files: ['./clusterpost-list/src/*.js', '!./clusterpost-list/**/*.min.js'],
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