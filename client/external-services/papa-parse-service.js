(function (angular, Papa) {
    'use strict';
    angular.module('papaParse', [])
        .factory('PapaParseService', ['$q', function PapaParseServiceProvider($q) {
            return {
                parse: function doParse(file) {
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
            };
        }]);
})(window.angular, window.Papa);