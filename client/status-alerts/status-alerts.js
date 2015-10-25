angular.module('amazonLookup')
    .controller('StatusAlertsCtrl', function ($scope, StatusService) {
        var self = this;
        self.logs = [];

        self.getStatusLabel = function(status) {
            var style = '';
            switch (status) {
                case 'error':
                    style = 'label-danger';
                    break;
                default:
                    style = 'label-' + status;
                    break;
            }
            return style;
        };

        $scope.$on('logsUpdated', function(event) {
            if(!$scope.$$phase) {
                self.logs = StatusService.getStatusLogs();
                $scope.$apply();
            }
        });
    });