// TODO: use File uploaded data instead
var _itemIds = '075691002589,815150018092';  // Tape measure, 2 pack tumblers

/**
 * Papa Parse - http://papaparse.com/
 */
var _Papa = Papa;

angular
    .module('amazonLookup', [ 'angular-meteor' ])

    /**
     * Source:
     * http://odetocode.com/blogs/scott/archive/2013/07/05/a-file-input-directive-for-angularjs.aspx
     */
    // TODO: move to separate file
    .directive('fileInput', function ($parse) {
        return {
            restrict: 'EA',
            template: '<input type="file" accept=".csv" />',
            replace: true,
            link: function (scope, element, attrs) {

                var modelGet = $parse(attrs.fileInput);
                var modelSet = modelGet.assign;
                var onChange = $parse(attrs.onChange);

                var updateModel = function () {
                    scope.$apply(function () {
                        modelSet(scope, element[0].files[0]);
                        onChange(scope);
                    });
                };

                element.bind('change', updateModel);
            }
        };
    })
    .controller('lookupCtrl',
        function($scope, $http, $meteor, $window, $filter, SearchService) {
            var self = this;

            // FILE INPUT - set up in external provider?
            var config = {
                complete: function(results, file) {
                    self.codePrint['Parse complete'] = results;
                },
                error: function(error, file) {
                    self.codePrint['Parse error'] = error;
                    self.file = null;
                }
            };
            self.parse = function() {
                _Papa.parse(self.file, config);
            };

            self.ResultCollection = $meteor.collection(ResultItems);
            self.codePrint = {}; // for debugging

            self.submit = function() {
                var itemIds = _itemIds;
                $meteor.call('searchByItemId', itemIds).then(
                    function success(data) {
                        self.codePrint['Query success!'] = true;
                        debugFormat();
                    },
                    function error(err) {
                        console.log('Failed search: ' + err);
                    }
                );
            };

            function debugFormat() {
                self.ResultCollection.forEach(function (obj, idx, arr) {
                    angular.forEach(obj, function (value, key) {
                        self.codePrint[key] = value;
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
            self.clicked = function parseValuesFromCollection() {
                self.results = '';
                self.ResultCollection.forEach(function(obj, idx, arr) {
                    var item = self.ResultCollection[idx]['Items'];

                    var foundValues = {};
                    for (var val in valuesToFind) {
                        foundValues[val] = SearchService.findValue(item, angular.copy(valuesToFind[val]));
                    }

                    self.results += SearchService.convertToCsv(foundValues, idx == 0);
                });
            };

            self.download = function download() {
                var encodedUri = encodeURIComponent(self.results);
                var elem = document.createElement('a');
                elem.href = 'data:attachment/csv,' + encodedUri;
                elem.target = '_blank';
                var dateTime = $filter('date')(Date.now(),'yyyy-MMM-dd_hh-mm');
                elem.download = dateTime + '__Results.csv';

                document.body.appendChild(elem);
                elem.click();
            };
        }) // end controller

    // TODO: move to separate file
    .factory('SearchService', [function() {
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

        /**
         * Converts all values into CSV string. Uses keys as header.
         */
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

        /**
         * Converts all values into CSV string
         */
        function convertToCsv(obj) {
            var csvOutput = '';
            // convert to forEach? what's more performant?
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
