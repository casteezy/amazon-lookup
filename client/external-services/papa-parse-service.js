(function (angular, Papa) {
    'use strict';
    angular.module('papaParse', [])
        /**
         * Wraps the PapaParse library in an angular promise.
         */
        .factory('PapaParseService', ['$q', function PapaParseServiceProvider($q) {
            function doParse(file) {
                var deferred = $q.defer();
                var papaConfig = {
                    complete: function success(results) {
                        deferred.resolve(results);
                    },
                    error: function error(err) {
                        deferred.reject(err);
                    }
                };
                Papa.parse(file, papaConfig);
                return deferred.promise;
            }

            return {
                parse: doParse
            };
        }]);
})(window.angular, window.Papa);