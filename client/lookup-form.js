var _itemId = '075691002589';

angular
    .module('amazonLookup', [
        'angular-meteor'
    ])
    .controller('lookupCtrl', ['$scope', '$http', '$meteor',
        function ($scope, $http, $meteor) {
            $scope.title = 'Amazon Item Lookup by UPC';
            $scope.results = '';
            $scope.codePrint = {};
            $scope.items = [];

            $scope.resultItems = $meteor.collection(ResultItems);

            $scope.submit = function () {
                var itemId = _itemId;
                $meteor.call('searchByItemId', itemId).then(
                    function success(data) {
                        console.log('Successful! ' + data);
                        if (data) {
                            $scope.codePrint['Callback Results'] = data;
                        }
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
                transformObjArray($scope.resultItems[0]);
                $scope.resultItems.forEach(function (obj, idx, arr) {
                    angular.forEach(obj, function (value, key) {
                        $scope.codePrint[key] = value;
                    });  // for debugging
                    //obj.Items && obj.Items.forEach(function (itemWrapper, indx, array) {
                        //angular.forEach(itemWrapper.Item, function (val, key) {
                        //    $scope.items.push(getItemData(val));
                        //});
                    //});
                });
            }

            $scope.clicked = function () {
                var resultItems = $scope.resultItems[0]['Items'];
                var valuesToFind = {
                    name: [ 'Item', 'ItemAttributes', 'Title' ],
                    listPrice: [ 'Item', 'ItemAttributes', 'ListPrice', 'FormattedPrice' ],
                    department: [ 'Item', 'ItemAttributes', 'Department' ],
                    productGroup: [ 'Item', 'ItemAttributes', 'ProductGroup' ],
                    productType: [ 'Item', 'ItemAttributes', 'ProductTypeName' ],
                    newCount: [ 'Item', 'OfferSummary', 'TotalNew' ],
                }

                for (var val in valuesToFind) {
                    $scope.codePrint[val] = find(resultItems, valuesToFind[val]);
                }
            };

            /**
             * @param searchObj object to search through
             * @param searchPropList list of properties to go through to get to value (hierarchy)
             * @returns found value
             */
            function find(searchObj, searchPropList) {
                if (!searchObj) { // Result not found
                    return;
                }
                if (searchPropList.length === 0) { // Result found
                    if (Array.isArray(searchObj) && searchObj.length === 1) {
                        return searchObj[0];
                    }
                    return searchObj;
                }
                var property = searchPropList.splice(0, 1); // Remove first object
                if (Array.isArray(searchObj)) { // Keep searching thru array-wrapped object
                    return find(searchObj[0][property], searchPropList);
                }
                // Keep searching thru object
                return find(searchObj[property], searchPropList);
            }

        }]); // end controller,
