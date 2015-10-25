angular.module('amazonLookup')
    .factory('StatusService', function ($rootScope, $filter) {
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
            console.log(status + ' - ' + message);
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
            },

            logInfo: function (message) {
                log('info', message);
            },

            logSuccess: function (message) {
                log('success', message);
            },

            logWarning: function (message) {
                log('warning', message);
            }
        };
    });