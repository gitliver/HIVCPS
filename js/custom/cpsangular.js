var cpsApp = angular.module('cpsApp', []);

cpsApp.controller('cpsCtrl', ['$scope', function($scope) {

	// a primer objects with coordinates
	$scope.primerobj = {
		'forwardStart': 0,
		'forwardEnd': 0,
		'reverseStart': 0,
		'reverseEnd': 0 
	};

	// patient categories
	$scope.pcategories = ["Acute treated (DNA)", "Chronic treated (DNA)", "VOA (DNA)", "Acute (RNA)", "Longitudinal (RNA)"];

	$scope.submitPrimer = function() {

		$scope.warning = '';

		for (var key in $scope.primerobj) {
			if ($scope.primerobj.hasOwnProperty(key)) {
				if ($scope.primerobj[key] <= 0) {
					$scope.warning = 'Please enter positive values for all the fields';
				}
				else if ($scope.primerobj[key].toString().indexOf('.') > -1) {
					$scope.warning = 'Please enter integer values for all the fields';
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
			runPrimerSet([new PrimerSet('user-supplied primer', [$scope.primerobj.forwardStart, $scope.primerobj.forwardEnd], [$scope.primerobj.reverseStart, $scope.primerobj.reverseEnd])]);
		}
	}
}]);
