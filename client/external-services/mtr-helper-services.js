(function(angular) {
    'use strict';

    var module = angular.module('meteorHelpers', []);

    module.factory('MeteorHelperService', ['$q', '$meteor', function ResultItemsMtrHelperProvider($q, $meteor) {
        function searchWithItemIds(itemIds, accountInfo) {
            var deferred = $q.defer();
            $meteor.call('searchByItemId', itemIds, accountInfo).then(
                function success(data) {
                    deferred.resolve(data);
                },
                function error(err) {
                    deferred.reject(err);
                }
            );
            return deferred.promise;
        }

        return {
            searchWithItemIds: searchWithItemIds
        }
    }]);

})(window.angular);