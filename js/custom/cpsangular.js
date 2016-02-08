
// patient category class
function Pcat(name, ischecked, isloaded, jsonpath, seqdata) {

	this.name = name;		// name
	this.ischecked = ischecked;	// is it check-boxed?
	this.isloaded = isloaded;	// is the data loaded?
	this.jsonpath = jsonpath;	// path to JSON
	this.seqdata = seqdata;		// data
}

var cpsApp = angular.module('cpsApp', []);

cpsApp.service('validateInputService', [function() {
	this.checkInput = function(myprimer, mypcats) {
		// Check if the user's input is problem-free
		// function takes primer object and categories dict as input
		// and returns a warning string

		var warn = 'Please choose at least one category';

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

		if (warn.length == 0 && !(myprimer.reverseEnd <= 9716)) {
			warn = 'Please satisfy the constraint: reverseEnd <= 9716 ';
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

cpsApp.service('computeCpsService', [function() {
	this.computeCps = function(myoutput) {
		// compute cps 

		var mycps = 0;
		var counter = 0;
		var sum = 0;
		var mylist = [];

		for (var key in myoutput) {
			if (myoutput.hasOwnProperty(key)) {
				counter++;
				sum += myoutput[key].p_amp_list[0];
				mylist.push(myoutput[key].p_amp_list[0]);
			}
		}

		if (counter > 0) mycps = sum/counter;
		
		// return mycps;
		return mylist;
	};
}]);

cpsApp.controller('cpsCtrl', ['$scope', '$http', '$q', 'validateInputService', 'loadDataService2', 'concatObjService', 'computeCpsService', function($scope, $http, $q, validateInputService, loadDataService2, concatObjService, computeCpsService) {

	// a primer objects with coordinates
	// $scope.primerobj = {
	// 	'forwardStart': 0,
	// 	'forwardEnd': 0,
	// 	'reverseStart': 0,
	// 	'reverseEnd': 0 
	// };

	// initialize
	$scope.primerobj = {
		'forwardStart': 1870,
		'forwardEnd': 1894,
		'reverseStart': 3409,
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

	// this function gets called when the user submits his primer
	$scope.submitPrimer = function() {

		// check for input errors
		$scope.warning = validateInputService.checkInput($scope.primerobj, $scope.pcategories);

		// if no problems with the input data, proceed
		if ($scope.warning.length == 0) {

			console.log('run primer set');

			// the specs of this class are defined in the other script - this variable will be used when calling runPrimerSet
			var myprimerset = [new PrimerSet('user-supplied primer', [$scope.primerobj.forwardStart, $scope.primerobj.forwardEnd], [$scope.primerobj.reverseStart, $scope.primerobj.reverseEnd])];

			// get promise object (array of promises and names)
			var promiseobj = loadDataService2.getpromises($scope.ref, $scope.pcategories);

			// console.log(promiseobj);
			
			// load data if it's not already loaded, then run
			if (promiseobj.mypromises.length > 0) {
				$scope.isLoadingMessage = "Sequence data loading. Please be patient...";
				// http://stackoverflow.com/questions/14545573/angular-accessing-data-of-multiple-http-calls-how-to-resolve-the-promises
				$q.all(promiseobj.mypromises).then(function(arrayOfResults) { 
					// once the code enters this block, it means all the async $http.get methods have finished
					// i.e., all data is loaded
					$scope.isLoadingMessage = null;

					// console.log(arrayOfResults);

					// loop thro loaded data sets
					for (var j = 0; j < arrayOfResults.length; j++) {
						// set properties of ref
						if (promiseobj.mynames[j] == 'HXB2S') {
							$scope.ref.seqdata = arrayOfResults[j].data;
							$scope.ref.isloaded = true;
						}
						// set properties of pcats
						for (var k = 0; k < $scope.pcategories.length; k++) {
							if ($scope.pcategories[k].name == promiseobj.mynames[j]) {
								$scope.pcategories[k].seqdata = arrayOfResults[j].data;
								$scope.pcategories[k].isloaded = true;
							}
						}
					} // loop thro loaded data sets

					// data loaded, now get alignment data
					// it's really inefficient to run this function every time
					// this should only be called if new boxes are checked for the new submission - fix later!
					$scope.myalignmentdata = concatObjService.concatObj($scope.pcategories);
					// now run
					$scope.myoutput = runPrimerSet(myprimerset, $scope.ref.seqdata, $scope.myalignmentdata);
					$scope.cps = math.mean(computeCpsService.computeCps($scope.myoutput));
					$scope.std = math.std(computeCpsService.computeCps($scope.myoutput));
				}); // $q.all
			} // load data
			// otherwise if data loaded, just run
			else {
				console.log('run');

				// data loaded, now get alignment data
				// it's really inefficient to run this function every time
				// this should only be called if new boxes are checked for the new submission - fix later!
				$scope.myalignmentdata = concatObjService.concatObj($scope.pcategories);
				$scope.myoutput = runPrimerSet(myprimerset, $scope.ref.seqdata, $scope.myalignmentdata);
				$scope.cps = math.mean(computeCpsService.computeCps($scope.myoutput));
				$scope.std = math.std(computeCpsService.computeCps($scope.myoutput));
				// hxb2 coordinates of some popular primer sets
				// kearney_f = (1870,1894)
				// kearney_r = (3409,3435)
				// console.log(output);

			} // run
		} // no problems with input
	} // scope.submitPrimer
}]);
