var module = angular.module('amazonLookup');

module.factory('ResultItemsMtrHelper', function ($meteor) {
    function search(itemIds, successCallback, errorCallback) {
        $meteor.call('searchByItemId', itemIds).then(
            function success(data) {
                console.log('searchByItemId method success!');
                successCallback && successCallback(data);
            },
            function error(err) {
                console.log('searchByItemId method error: ' + err);
                errorCallback && errorCallback(err);
            }
        );
    }
    function clear(successCallback, errorCallback) {
        $meteor.call('clearResults').then(
            function success(data) {
                console.log('clearResults method success!');
                successCallback && successCallback(data);
            },
            function error(err) {
                console.log('clearResults method error: ' + err);
                errorCallback && errorCallback(err);
            }
        )
    }

    return {
        searchWithItemIds: search,
        clearResults: clear
    }
});