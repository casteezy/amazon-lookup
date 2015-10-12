angular
    .module('amazonLookup', [
        'angular-meteor'
    ])
    .controller('lookupCtrl', ['$scope', '$http', '$meteor', 'SearchService',
        function($scope, $http, $meteor, SearchService) {
            var _itemId = '075691002589';

            //$scope.results = '';
            $scope.codePrint = {}; // for debugging

            $scope.resultItems = $meteor.collection(ResultItems);

            $scope.submit = function() {
                var itemId = _itemId;
                $meteor.call('searchByItemId', itemId).then(
                    function success(data) {
                        console.log('Successful!');
                        if ($scope.resultItems.length === 0) {
                            $scope.codePrint['Result Items?'] = false;
                        } else {
                            $scope.codePrint['Query success!'] = true;
                        }
                        debugFormat();
                    },
                    function error(err) {
                        console.log('Failed search: ' + err);
                    }
                );
            }

            function debugFormat() {
                //transformObjArray($scope.resultItems[0]);
                $scope.resultItems.forEach(function (obj, idx, arr) {
                    angular.forEach(obj, function (value, key) {
                        $scope.codePrint[key] = value;
                    });  // for debugging

                    //$scope.items = [];
                    //obj.Items && obj.Items.forEach(function (itemWrapper, indx, array) {
                    //angular.forEach(itemWrapper.Item, function (val, key) {
                    //    $scope.items.push(getItemData(val));
                    //});
                    //});
                });
            }

            var valuesToFind = {
                name: ['Item', 'ItemAttributes', 'Title'],
                listPrice: ['Item', 'ItemAttributes', 'ListPrice', 'FormattedPrice'],
                department: ['Item', 'ItemAttributes', 'Department'],
                productGroup: ['Item', 'ItemAttributes', 'ProductGroup'],
                productType: ['Item', 'ItemAttributes', 'ProductTypeName'],
                newCount: ['Item', 'OfferSummary', 'TotalNew'],
            };
            $scope.clicked = function () {
                var resultItems = $scope.resultItems[0]['Items'];

                var foundValues = {};
                for (var val in valuesToFind) {
                    foundValues[val] = SearchService.findValue(resultItems, valuesToFind[val]);
                }
                $scope.results = SearchService.convertToCsvInternal(foundValues);
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

        // TODO
        function convertToCsvInternal(obj) {
            return JSON.stringify(obj); // temporary
        }

        return {
            findValue: findValueInternal,
            convertToCsv: convertToCsvInternal
        };
    }]); // end service
