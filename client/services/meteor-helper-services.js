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

module.factory('SavedSearchesMtrHelper', function ($meteor) {
    function save(searchedValues, successCallback, errorCallback) {
        $meteor.call('saveSearch', Date.now(), searchedValues).then(
            function success(data) {
                console.log('saveSearch method success!');
                successCallback && successCallback(data);
            },
            function error(err) {
                console.log('saveSearch method error: ' + err);
                errorCallback && errorCallback(err);
            }
        );
    }

    return {
        saveSearch: save
    }
});