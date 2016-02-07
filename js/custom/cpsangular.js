var cpsApp = angular.module('cpsApp', []);

cpsApp.service('validateInputService', [function() {
	this.checkInput = function(myprimer) { 
		// Check if the user's input is problem-free
		// function takes primer object as input
		// and returns a warning string

		var warn = '';

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

cpsApp.service('loadDataService', [function() {
	this.loadData = function() { 
		// Load large sequence data sets

		// http://www.javascriptkit.com/javatutors/loadjavascriptcss.shtml
		var fileref=document.createElement('script');
		fileref.setAttribute('type','text/javascript');
		fileref.setAttribute('src', 'js/data/hxb2s_dump.js');
		document.getElementsByTagName("head")[0].appendChild(fileref);

	};
}]);

cpsApp.service('loadDataService2', ['$http', function($http) {
	// Load large sequence data sets

	// my return value
	// var myret = {};

	this.loadData = function() { 

		// $http.get('js/data/hxb2s.json').then(function (response) {
		// 	myret = response.data;
		// });

		// return myret;
		return $http.get('js/data/hxb2s.json');

	};
}]);

// cpsApp.controller('cpsCtrl', ['$scope', 'validateInputService', 'loadDataService', 'dataFactory', function($scope, validateInputService, loadDataService, dataFactory) {
// cpsApp.controller('cpsCtrl', ['$scope', 'validateInputService', 'loadDataService', function($scope, validateInputService, loadDataService) {
// cpsApp.controller('cpsCtrl', ['$scope', '$http', 'validateInputService', 'loadDataService2', function($scope, $http, validateInputService, loadDataService2) {
cpsApp.controller('cpsCtrl', ['$scope', '$http', 'validateInputService', function($scope, $http, validateInputService) {

	// a primer objects with coordinates
	$scope.primerobj = {
		'forwardStart': 0,
		'forwardEnd': 0,
		'reverseStart': 0,
		'reverseEnd': 0 
	};

	// patient categories
	$scope.pcategories = {
		'Acute treated (DNA)': false, 
		'Chronic treated (DNA)': false,
		'VOA (DNA)': false,
		'Acute (RNA)': false,
		'Longitudinal (RNA)': false
	};

	// a boolean to tell us if the page is loading
	$scope.isLoading = true;
	$scope.isLoadingMessage = null;

	// hxb2s sequence
	$scope.hxb2s = null; 

	// this function gets called when the user submits his primer
	$scope.submitPrimer = function() {

		// check for input errors
		$scope.warning = validateInputService.checkInput($scope.primerobj);

		// if no problems with the input data, proceed
		if ($scope.warning.length == 0) {

			console.log('run primer set');

			// load data if it's not already loaded, load then run
			if ($scope.isLoading) {
				$scope.isLoadingMessage = "Your data is loading. Please be patient...";
				$http.get('js/data/hxb2s.json').then(function (response) {
					// once the code enters this block, it means the async $http.get method has finished
					$scope.hxb2s = response.data;
					$scope.isLoading = false;
					$scope.isLoadingMessage = null;
					console.log($scope.hxb2s);
				});
			}
			// otherwise, just run
			else {
				console.log($scope.hxb2s);
			}

			// loadDataService.loadData();
			// console.log(hxb2s_data);
			// var hxb2s = dataFactory;
			//hxb2s = loadDataService2.loadData();
			// console.log(hxb2s);
			// runPrimerSet([new PrimerSet('user-supplied primer', [$scope.primerobj.forwardStart, $scope.primerobj.forwardEnd], [$scope.primerobj.reverseStart, $scope.primerobj.reverseEnd])]);
		}
	}
}]);
