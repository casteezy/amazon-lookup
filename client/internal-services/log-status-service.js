(function(angular) {
    'use strict';

    angular.module('amazonLookup')
    .factory('StatusService', function ($rootScope, $filter, $log) {
        var statusLogs = [];

        function getCurrentDateTime() {
            return $filter('date')(Date.now(), 'yyyy-MMM-dd hh:mm:sss');
        }

        function log(status, message) {
            var now = getCurrentDateTime();
            var logData = {
                status: status,
                dateTime: now,
                formattedMessage: '[' + now + '] ' + message,
                message: message
            };
            statusLogs.push(logData);
            $rootScope.$broadcast('logsUpdated');
        }

        return {
            clear: function () {
                statusLogs = [];
                $rootScope.$broadcast('logsUpdated');
            },

            getStatusLogs: function() {
                return statusLogs;
            },

            logError: function (message) {
                log('error', message);
                $log.error(status, message);
            },

            logInfo: function (message) {
                log('info', message);
                $log.info(status, message);
            },

            logSuccess: function (message) {
                log('success', message);
                $log(status, message);
            },

            logWarning: function (message) {
                log('warning', message);
                $log.warn(status, message);
            }
        };
    });

})(window.angular);