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
				else if (myprimer[key].toString().indexOf('.') > -1) {
					warn = 'Please enter integer values for all the fields';
				}
			}
		}
		
		if (warn.length == 0 && !(myprimer.forwardStart > 0)) { 
			warn = 'Please satisfy the constraint: forwardStart > 0';
		}

		if (warn.length == 0 && !(myprimer.forwardEnd > myprimer.forwardStart && myprimer.reverseEnd > myprimer.reverseStart)) {
			warn = 'Please satisfy the constraint: End > Start';
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

cpsApp.controller('cpsCtrl', ['$scope', 'validateInputService', function($scope, validateInputService) {

	// a primer objects with coordinates
	$scope.primerobj = {
		'forwardStart': 0,
		'forwardEnd': 0,
		'reverseStart': 0,
		'reverseEnd': 0 
	};

	// patient categories
	$scope.pcategories = ["Acute treated (DNA)", "Chronic treated (DNA)", "VOA (DNA)", "Acute (RNA)", "Longitudinal (RNA)"];

	// this function gets called when the user submits his primer
	$scope.submitPrimer = function() {

		// check for input errors
		$scope.warning = validateInputService.checkInput($scope.primerobj);

		// if no problems with the input data, proceed
		if ($scope.warning.length == 0) {
			runPrimerSet([new PrimerSet('user-supplied primer', [$scope.primerobj.forwardStart, $scope.primerobj.forwardEnd], [$scope.primerobj.reverseStart, $scope.primerobj.reverseEnd])]);
		}
	}
}]);
