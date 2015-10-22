var module = angular.module('amazonLookup');
module.factory('StatusService', function ($filter) {
    var statuses = {
        info: [],
        warning: [],
        error: [],
        success: []
    };

    function getCurrentDateTime() {
        return $filter('date')(Date.now(), 'yyyy-MMM-dd hh:mm:sss');
    }

    function log(status, message) {
        var now = getCurrentDateTime();
        var data = {
            dateTime: now,
            formattedMessage: '[' + now + '] ' + message,
            message: message
        };
        statuses[status].push(data);
    }

    return {
        clear: function() {
            angular.forEach(statuses, function(status) {
                status.splice(0, status.length);
            });
        },

        logError: function(message) {
            log('error', message);
        },
        getErrors: function() {
            return statuses.error;
        },

        logInfo: function(message) {
            log('info', message);
        },
        getInfo: function() {
            return statuses.info;
        },

        logSuccess: function(message) {
            log('success', message);
        },
        getSuccesses: function() {
            return statuses.success;
        },

        logWarning: function(message) {
            log('warning', message);
        },
        getWarnings: function() {
            return statuses.warning;
        }
    };
});

module.controller('StatusAlertsCtrl', function(StatusService) {
    var self = this;

    self.errorMessages = StatusService.getErrors();
    self.infoMessages = StatusService.getInfo();
    self.successMessages = StatusService.getSuccesses();
    self.warningMessages = StatusService.getWarnings();

});