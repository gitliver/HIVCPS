
// patient category class
function Pcat(name, ischecked, isloaded, jsonpath, seqdata) {

	this.name = name;		// name
	this.ischecked = ischecked;	// is it check-boxed?
	this.isloaded = isloaded;	// is the data loaded?
	this.jsonpath = jsonpath;	// path to JSON
	this.seqdata = seqdata;		// data
}

// hacky getter function to extract properties of output object - return arrays of keys and pamps
function getSlice(myoutput) {

	// keys 
	var mylist = [];
	// pamp list
	var mylist2 = [];

	for (var key in myoutput) {
		if (myoutput.hasOwnProperty(key)) {
			mylist.push(key);
			mylist2.push(myoutput[key].p_amp_list[0]);
		}
	}

	return { 'patList': mylist, 'pampList': mylist2 };
}

// reverse complement
function revComp(mySeq) {

	// complements
	comp = {'A':'T', 'T':'A', 'G':'C', 'C':'G', 'N':'N', '-':'-'};
	return mySeq.split('').map(function(x){return comp[x]}).reverse().join('');
}

var cpsApp = angular.module('cpsApp', ['ngRoute']);

cpsApp.service('validateInputService', [function() {
	this.checkInput = function(myprimer, mypcats) {
		// Check if the user's input is problem-free
		// function takes primer object and categories dict as input
		// and returns a warning string

		// warning
		var warn = 'Please choose at least one category';
		// length of the sequence
		var maxlen = 9719;

		// if at least one category checked, turn off warning
		for (var i = 0; i < mypcats.length; i++) {
			if (mypcats[i].ischecked) {
				warn = '';
			}
		}

		for (var key in myprimer) {
			if (myprimer.hasOwnProperty(key)) {
				if (myprimer[key] <= 0) {
					warn = 'Please enter positive values for all the fields';
				}
				else if (Number(myprimer[key]).toString().indexOf('.') > -1) {
					warn = 'Please enter integer values for all the fields';
				}
			}
		}
		
		if (warn.length == 0 && !(myprimer.forwardStart > 0)) { 
			warn = 'Please satisfy the constraint: forwardStart > 0';
		}

		if (warn.length == 0 && !(myprimer.forwardEnd > myprimer.forwardStart && myprimer.reverseEnd > myprimer.reverseStart)) {
			warn = 'Please enter positive values for all the fields and satisfy the constraint: End > Start';
		}

		if (warn.length == 0 && !(myprimer.reverseStart > myprimer.forwardEnd)) {
			warn = 'Please satisfy the constraint: reverseStart > forwardEnd';
		}

		if (warn.length == 0 && !(myprimer.reverseEnd <= maxlen)) {
			warn = 'Please satisfy the constraint: reverseEnd <= ' + maxlen;
		}

		return warn;
	};
}]);

cpsApp.service('loadDataService2', ['$http', function($http) {
	// Load large sequence data sets - specifically, return array of promises

	this.getpromises = function(ref, mypcats) { 

		// return values
		// an array of promises
		var mypromises = [];
		// corresponding array of names
		var mynames = [];
		// number checked
		var numchecked = 0;

		// figure out if we have to load data
		for (var i = 0; i < mypcats.length; i++) {
			if (mypcats[i].ischecked) numchecked++;
			if (mypcats[i].ischecked && !(mypcats[i].isloaded)) {
				mypromises.push($http.get(mypcats[i].jsonpath));
				mynames.push(mypcats[i].name);
			}
		}

		// figure out if we have to load ref
		if (!(ref.isloaded)) {
			mypromises.push($http.get(ref.jsonpath));
			mynames.push(ref.name);
		}

		return { 'mypromises': mypromises, 'mynames': mynames, 'numchecked': numchecked };
	};
}]);

cpsApp.service('concatObjService', [function() {
	this.concatObj = function(mypcats) {
		// concatenate alignment data

		// the concatenated alignments
		var myalignments = {};

		// loop thro checked alignment sets
		for (var i = 0; i < mypcats.length; i++) {
			if (mypcats[i].ischecked) {
				// now loop thro sequence data itself
				for (var key in mypcats[i].seqdata) {
					if (mypcats[i].seqdata.hasOwnProperty(key)) {
						myalignments[key] = mypcats[i].seqdata[key];
					}
				}
			}
		}

		return myalignments;
	};
}]);

cpsApp.service('setPcatsService', [function() {
	this.setPcats = function(arrayOfResults, promiseobj, ref, mypcats) {
		// when the data has finished loading,
		// this function sets properties of the pcat objects - such as their seqdata fields

		// loop thro loaded data sets
		for (var j = 0; j < arrayOfResults.length; j++) {
			// set properties of ref
			if (promiseobj.mynames[j] == 'HXB2S') {
				ref.seqdata = arrayOfResults[j].data;
				ref.isloaded = true;
			}
			// set properties of pcats
			for (var k = 0; k < mypcats.length; k++) {
				if (mypcats[k].name == promiseobj.mynames[j]) {
					mypcats[k].seqdata = arrayOfResults[j].data;
					mypcats[k].isloaded = true;
				}
			}
		} // loop thro loaded data sets
	};
}]);

// service to graph final array of pamps
cpsApp.service('graphService', [function() {
	this.makeGraph = function(myOutput, myCPS, myStd, userxdata, userydata) {
		// http://c3js.org

		// x-axis
		var x2 = ['x2', 0, 0];
		// a line with slope cps/100
		var mydata2 = ['cps/100', 0, 0];
		// a line with slope cps/100 +/- standard deviation
		var stdplus = ['stdev+', 0, 0];
		var stdneg = ['stdev-', 0, 0];
		// the x-axis max (10% higher than the max x value)
		var xmax = 1;

		for (var i = 1; i < userxdata.length; i++) {
			// find max
			if (userxdata[i] > x2[2]) {
				x2[2] = userxdata[i];
				mydata2[2] = userxdata[i] * myCPS/100;
				stdplus[2] = userxdata[i] * (myCPS + myStd)/100;
				stdneg[2] = userxdata[i] * (myCPS - myStd)/100;
				xmax = 1.10 * userxdata[i];
			}
		}

		var chart = c3.generate({
			bindto: '#chart',
			data: {
					xs: {
						'uniqseq': 'x1',
						'cps/100': 'x2',
						'stdev+': 'x2',
						'stdev-': 'x2',
					},
					columns: [
						userxdata,
						userydata,
						x2,
						mydata2,
						stdplus,
						stdneg,
					],
					type: 'scatter',
					types: {
						'cps/100': 'area',
						'stdev+': 'line',
						'stdev-': 'line',
					},
					colors: {
						'uniqseq': '#0000ff',
						'cps/100': '#99cc00',
						'stdev+': '#ff9999',
						'stdev-': '#ff9999',
					}
			},
			axis: {
				x: {
					label: 'Number of sequences analyzed (total)',
					min: 0,
					max: xmax,
				},
				y: {
					label: 'Number of unique sequences analyzed',
					min: 0,
				}
			},
			point: {
				r: 5
			},
		});
	};
}]);

cpsApp.controller('cpsCtrl', ['$scope', '$http', '$q', 'validateInputService', 'loadDataService2', 'concatObjService', 'setPcatsService', 'graphService', function($scope, $http, $q, validateInputService, loadDataService2, concatObjService, setPcatsService, graphService) {

	// get reference sequence

	var refseq = null;

	$http.get('js/data/hxb2s_seq.json').then(function(response) {
        	 refseq = response.data;
    	});

	// initialize with hxb2 coordinates of some popular primer sets
	// kearney_f = (1870,1894); kearney_r = (3409,3435)

	$scope.primerobj = {
		'forwardStart': 1871,
		'forwardEnd': 1894,
		'reverseStart': 3410,
		'reverseEnd': 3435 
	};

	// patient categories
	$scope.pcategories = [
		new Pcat('Acute treated (DNA)', true, false, 'js/data/acute_DNA.json', null), 
		new Pcat('Chronic treated (DNA)', false, false, 'js/data/chronic_DNA.json', null),
		new Pcat('VOA (DNA)', false, false, 'js/data/VOA_DNA.json', null),
		new Pcat('Acute (RNA)', false, false, 'js/data/acute_RNA.json', null),
		new Pcat('Longitudinal (RNA)', false, false, 'js/data/longitudinal_RNA.json', null)
	];

	// reference
	$scope.ref = new Pcat('HXB2S', true, false, 'js/data/hxb2s.json', null);

	// message to the user - start null until submit button pushed
	$scope.isLoadingMessage = null;

	// the alignment data, possibly concatenated over multiple categories
	$scope.myalignmentdata = null;

	// the output
	$scope.myoutput = null;

	// the CPS
	$scope.cps = null;

	// the CPS standard deviation
	$scope.std = null;

	// the foward primer nucleotide string
	$scope.fprimer = '';

	// the reverse primer nucleotide string
	$scope.rprimer = '';

	// the reverse primer reverse complement nucleotide string
	$scope.rcrprimer = '';

	// user inputted tot and uniq seqs
	$scope.userobj = {
		'totseq': 0,
		'uniqseq': 0,
	};

	// variables to be passed to the graph
	xdata = null;
	ydata = null;

	// this function gets called when the user submits his primer
	$scope.submitPrimer = function() {

		// check for input errors
		$scope.warning = validateInputService.checkInput($scope.primerobj, $scope.pcategories);

		// if no problems with the input data, proceed
		if ($scope.warning.length == 0) {

			// clear graph
			document.getElementById('chart').innerHTML = "";

			// reset these
			xdata = ['x1'];
			ydata = ['uniqseq'];

			// the specs of this class are defined in the other script - this variable will be used when calling runPrimerSet
			var myprimerset = [new PrimerSet('user-supplied primer', [$scope.primerobj.forwardStart, $scope.primerobj.forwardEnd], [$scope.primerobj.reverseStart, $scope.primerobj.reverseEnd])];

			// get promise object (array of promises and names)
			var promiseobj = loadDataService2.getpromises($scope.ref, $scope.pcategories);

			// load data if it's not already loaded, then run
			if (promiseobj.mypromises.length > 0) {
				$scope.isLoadingMessage = "Sequence data loading. Please be patient...";
				// http://stackoverflow.com/questions/14545573/angular-accessing-data-of-multiple-http-calls-how-to-resolve-the-promises
				$q.all(promiseobj.mypromises).then(function(arrayOfResults) { 
					// once the code enters this block, it means all the async $http.get methods have finished
					// i.e., all data is loaded
					$scope.isLoadingMessage = null;

					// This populates the pcats objects with sequence data, etc., from the arrayOfResults
					setPcatsService.setPcats(arrayOfResults, promiseobj, $scope.ref, $scope.pcategories); 

					// data loaded, now get alignment data (inefficient to run this function every time.
					// this should only be called if new boxes are checked for the new submission)
					$scope.myalignmentdata = concatObjService.concatObj($scope.pcategories);
					// now run - this calls a function defined in the other script, cpscalculator.js 
					$scope.myoutput = runPrimerSet(myprimerset, $scope.ref.seqdata, $scope.myalignmentdata);
					$scope.cps = 100 * math.mean(getSlice($scope.myoutput).pampList);
					$scope.std = 100 * math.std(getSlice($scope.myoutput).pampList);
					$scope.fprimer = refseq['HXB2'].substring($scope.primerobj['forwardStart'] - 1, $scope.primerobj['forwardEnd']);
					$scope.rprimer = refseq['HXB2'].substring($scope.primerobj['reverseStart'] - 1, $scope.primerobj['reverseEnd']);
					$scope.rcrprimer = revComp($scope.rprimer);
					// graphService.makeGraph($scope.myoutput, $scope.cps, xdata, ydata);
				}); // $q.all
			} // load data
			// otherwise if data loaded, just run
			else {
				// see comment above
				$scope.myalignmentdata = concatObjService.concatObj($scope.pcategories);
				$scope.myoutput = runPrimerSet(myprimerset, $scope.ref.seqdata, $scope.myalignmentdata);
				$scope.cps = 100 * math.mean(getSlice($scope.myoutput).pampList);
				$scope.std = 100 * math.std(getSlice($scope.myoutput).pampList);
				$scope.fprimer = refseq['HXB2'].substring($scope.primerobj['forwardStart'] - 1, $scope.primerobj['forwardEnd']);
				$scope.rprimer = refseq['HXB2'].substring($scope.primerobj['reverseStart'] - 1, $scope.primerobj['reverseEnd']);
				$scope.rcrprimer = revComp($scope.rprimer);
				// graphService.makeGraph($scope.myoutput, $scope.cps, xdata, ydata);
			} // run
		} // no problems with input
	} // scope.submitPrimer

	// this function gets called when the user add points to the graph generated after submit primer
	$scope.addPoints = function() {
		xdata.push($scope.userobj.totseq);
		ydata.push($scope.userobj.uniqseq);
		graphService.makeGraph($scope.myoutput, $scope.cps, $scope.std, xdata, ydata);
	} // scope.addPoints
}]);

// Angular routing to partials
cpsApp.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {

    // Saying '/' actually means: http://myurl.com/#/
    // Saying '/test' actually means: http://myurl.com/#/test and so on
    // In this awkward way, conflicts between Django's URL routing mechanism and
    // Angular's are avoided, since Django only deals with non-# paths

    // also see: http://stackoverflow.com/questions/11972026/delaying-angularjs-route-change-until-model-loaded-to-prevent-flicker

    // switch between views
    $routeProvider
	.when('/', {
		templateUrl: '/cps/partials/mainview.html',
		controller: 'cpsCtrl',
	})
	.when('/about', {
		templateUrl: '/cps/partials/about.html',
		controller: 'cpsCtrl',
	})
	.otherwise({
		redirectTo: '/'
	});

    // $locationProvider.html5Mode({
    //     enabled: true,
    //     requireBase: false
    // });	

    // $locationProvider.html5Mode(true);

}]);
