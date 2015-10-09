var module = angular.module('amazonLookup', [
    'angular-meteor'
]);

module.controller('lookupCtrl', ['$scope', '$http', '$meteor',
    function ($scope, $http, $meteor) {
        $scope.title = 'Amazon Item Lookup by UPC';
        $scope.results = '';
        $scope.codePrint = {};
        $scope.items = [];

        $scope.resultItems = $meteor.collection(ResultItems);

        $scope.submit = function () {
            var itemId = '075691002589';
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
                    format();
                },
                function error(err) {
                    console.log('Failed search: ' + err);
                }
            );
        }

        function format() {
            $scope.resultItems.forEach(function (obj, idx, arr) {
                angular.forEach(obj, function (value, key) {
                    $scope.codePrint[key] = value;
                });
                obj.Items && obj.Items.forEach(function (itemWrapper, indx, array) {
                    angular.forEach(itemWrapper.Item, function (val, key) {
                        $scope.items.push(getItemData(val));
                    });
                });
            });
        }

        $scope.clicked = format;

        function getItemData(item) {
            if (!item) {
                return {};
            }
            var itemAttrs = item.ItemAttributes[0];
            return {
                price: itemAttrs.ListPrice[0].FormattedPrice[0],
                newCount: item.OfferSummary[0].TotalNew[0],
                //department: itemAttrs.Department[0],
                productGroup: itemAttrs.ProductGroup[0],
                title: itemAttrs.Title[0]
            };
        }

    }]); // end controller,
