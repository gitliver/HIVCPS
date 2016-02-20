module.exports = function(grunt) {

    // loosely following: https://24ways.org/2013/grunt-is-not-weird-and-hard/

    // Project configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
    
        // "Configuration for concatinating files"
        concat: {   
            dist: {
                src: [	'node_modules/angular/angular.js',
			'node_modules/angular-route/angular-route.js',
			'node_modules/d3/d3.js',
			'node_modules/c3/c3.js',
			'node_modules/mathjs/dist/math.js',
			'custom/*.js',
                     ],
                dest: 'build/production.js',
            }
        },
        // uglify = minify
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'build/production.js',
                dest: 'build/production.min.js'
            }
        }
    });
    
    // Load the plugin that provides the "uglify" task.
    // "Where we tell Grunt we plan to use this plug-in"
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    
    // Default task(s).
    // "Where we tell Grunt what to do when we type 'grunt' into the terminal."
    grunt.registerTask('default', ['concat', 'uglify']);

};
