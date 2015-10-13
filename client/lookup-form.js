var _itemIds = '075691002589,815150018092';  // Tape measure, 2 pack tumblers

angular
    .module('amazonLookup', [
        'angular-meteor'
    ])
    .controller('lookupCtrl', ['$scope', '$http', '$meteor', '$window', '$filter', 'SearchService',
        function($scope, $http, $meteor, $window, $filter, SearchService) {

            $scope.codePrint = {}; // for debugging
            $scope.resultItems = $meteor.collection(ResultItems);

            $scope.submit = function() {
                var itemIds = _itemIds;
                $meteor.call('searchByItemId', itemIds).then(
                    function success(data) {
                        $scope.codePrint['Query success!'] = true;
                        debugFormat();
                    },
                    function error(err) {
                        console.log('Failed search: ' + err);
                    }
                );
            }

            function debugFormat() {
                $scope.resultItems.forEach(function (obj, idx, arr) {
                    angular.forEach(obj, function (value, key) {
                        $scope.codePrint[key] = value;
                    });  // for debugging
                });
            }

            var valuesToFind = {
                name: ['Item', 'ItemAttributes', 'Title'],
                listPrice: ['Item', 'ItemAttributes', 'ListPrice', 'FormattedPrice'],
                department: ['Item', 'ItemAttributes', 'Department'],
                productGroup: ['Item', 'ItemAttributes', 'ProductGroup'],
                productType: ['Item', 'ItemAttributes', 'ProductTypeName'],
                newCount: ['Item', 'OfferSummary', 'TotalNew']
            };

            $scope.clicked = function() {
                $scope.results = '';
                $scope.resultItems.forEach(function(obj, idx, arr) {
                    var item = $scope.resultItems[idx]['Items'];

                    var foundValues = {};
                    for (var val in valuesToFind) {
                        foundValues[val] = SearchService.findValue(item, angular.copy(valuesToFind[val]));
                    }

                    $scope.results += SearchService.convertToCsv(foundValues, idx == 0);
                });
            };

            $scope.download = function() {
                var encodedUri = encodeURIComponent($scope.results);
                var elem = document.createElement('a');
                elem.href = 'data:attachment/csv,' + encodedUri;
                elem.target = '_blank';
                var dateTime = $filter('date')(Date.now(),'yyyy-MMM-dd_hh-mm');
                elem.download = dateTime + '__Results.csv';

                document.body.appendChild(elem);
                elem.click();
            };
        }]) // end controller

    .service('SearchService', [function() {
        /**
         * @param searchObj object to search through
         * @param searchPropList list of properties to go through to get to value (hierarchy)
         * @returns found value in object
         */
        function findValueInternal(searchObj, searchPropList) {
            if (!searchObj) { // Result not found
                return null;
            }
            if (searchPropList.length === 0) { // Result found
                if (Array.isArray(searchObj) && searchObj.length === 1) {
                    return searchObj[0];
                }
                return searchObj;
            }
            var firstProperty = searchPropList.splice(0, 1)[0]; // Remove first object
            if (Array.isArray(searchObj)) { // Keep searching thru array-wrapped object
                return findValueInternal(searchObj[0][firstProperty], searchPropList);
            }
            // Keep searching thru object
            return findValueInternal(searchObj[firstProperty], searchPropList);
        }

        function convertToCsvWithHeaders(obj) {
            var csvColumns = '';
            var csvOutput = '';

            var objKeys = Object.keys(obj);
            for (var i = 0; i < objKeys.length; i++) {
                var key = objKeys[i];

                csvColumns += key;
                if (obj[key]) {
                    csvOutput += '\"' + obj[key] + '\"';
                } else {
                    csvOutput += 'null';
                }
                if (i < (objKeys.length - 1)) {
                    csvColumns += ',';
                    csvOutput += ',';
                }
            }
            var csvList = csvColumns + '\n' + csvOutput + '\n';
            return csvList;
        }

        function convertToCsv(obj) {
            var csvOutput = '';

            var objKeys = Object.keys(obj);
            for (var i = 0; i < objKeys.length; i++) {
                var key = objKeys[i];

                if (obj[key]) {
                    csvOutput += '\"' + obj[key] + '\"';
                } else {
                    csvOutput += 'null';
                }
                if (i < (objKeys.length - 1)) {
                    csvOutput += ',';
                }
            }
            return csvOutput + '\n';
        }

        function convertInternal(obj, includeHeaders) {
            return includeHeaders ? convertToCsvWithHeaders(obj) : convertToCsv(obj);
        }

        return {
            findValue: findValueInternal,
            convertToCsv: convertInternal
        };
    }]); // end service
