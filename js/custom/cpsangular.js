var cpsApp = angular.module('cpsApp', []);

cpsApp.controller("cpsCtrl", function($scope) {
    $scope.firstName = "John";
    $scope.lastName = "Doe";
});

cpsApp.controller('cpsCtrl', ['$scope', function($scope) {

	// a primer objects with coordinates
	$scope.primerobj = {
		'forwardStart': null,
		'forwardEnd': null,
		'reverseStart': null,
		'reverseEnd': null 
	};

	// patient categories
	$scope.pcategories = ["Acute treated (DNA)", "Chronic treated (DNA)", "VOA (DNA)", "Acute (RNA)", "Longitudinal (RNA)"];

	$scope.submitPrimer = function() {

		$scope.warning = '';

		for (var key in $scope.primerobj) {
			if ($scope.primerobj.hasOwnProperty(key)) {
				if ($scope.primerobj[key] == null) {
					$scope.warning = 'Please enter values for all the fields';
				}
			}
		}
		
		if ($scope.warning.length == 0 && !($scope.primerobj.forwardStart > 0)) { 
			$scope.warning = 'Please satisfy the constraint: forwardStart > 0';
		}

		if ($scope.warning.length == 0 && !($scope.primerobj.forwardEnd > $scope.primerobj.forwardStart && $scope.primerobj.reverseEnd > $scope.primerobj.reverseStart)) {
			$scope.warning = 'Please satisfy the constraint: End > Start';
		}

		if ($scope.warning.length == 0 && !($scope.primerobj.reverseStart > $scope.primerobj.forwardEnd)) {
			$scope.warning = 'Please satisfy the constraint: reverseStart > forwardEnd';
		}

		if ($scope.warning.length == 0 && !($scope.primerobj.reverseEnd <= 9716)) {
			$scope.warning = 'Please satisfy the constraint: reverseEnd <= 9716 ';
		}

		// if no problems with the input data
		if ($scope.warning.length == 0) {
			runPrimerSet([new PrimerSet('p6-gag-pro', [1870, 1894], [3409, 3435])]);
		}
	}
}]);
