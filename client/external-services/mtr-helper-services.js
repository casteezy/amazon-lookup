(function(angular) {
    'use strict';

    var module = angular.module('meteorHelpers', []);

    module.factory('ResultItemsMtrHelper', function ResultItemsMtrHelperProvider($q, $meteor) {
        function getResults() {

        }
        function search(itemIds) {
            var deferred = $q.defer();
            $meteor.call('searchByItemId', itemIds).then(
                function success(data) {
                    deferred.resolve(data);
                },
                function error(err) {
                    deferred.reject(err);
                }
            );
            return deferred.promise;
        }

        function clear() {
            /*var deferred = $q.defer();
            $meteor.call('clearResults').then(
                function success(data) {
                    deferred.resolve(data);
                },
                function error(err) {
                    deferred.reject(err);
                }
            );
            return deferred.promise;*/
        }

        return {
            getResults: getResults,
            searchWithItemIds: search,
            clearResults: clear
        }
    });

})(window.angular);