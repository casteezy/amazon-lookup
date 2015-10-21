// TODO: use File uploaded data instead. DELETE ME.
var _itemIds = '075691002589,815150018092';  // Tape measure, 2 pack tumblers

/**
 * Papa Parse - http://papaparse.com/
 */
var _Papa = Papa;

// TODO: prefix all with module
// var module =
angular
    .module('amazonLookup', ['angular-meteor'])

/**
 * Source:
 * http://odetocode.com/blogs/scott/archive/2013/07/05/a-file-input-directive-for-angularjs.aspx
 */
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

                scope.$on('clearFileFromUploader', function () {
                    modelSet(scope, []);
                    element.val(null);
                });

                element.bind('change', updateModel);
            }
        };
    })
    /**
     * Saves and manages array of IDs.
     */
    .factory('IdService', function () {
        var savedIds = [];

        /**
         * Clear all IDs in array;
         */
        function reset() {
            savedIds = [];
        }

        /**
         * Save array of IDs into existing array
         */
        function save(itemIds) {
            if (Array.isArray(itemIds)) {
                Array.prototype.push.apply(savedIds, itemIds);
            }
        }

        /**
         * Get copy of ID array.
         */
        function get() {
            return angular.copy(savedIds);
        }

        /**
         * Get ID array as CSV string.
         */
        function getString() {
            return savedIds.toString();
        }

        return {
            resetIds: reset,
            saveIds: save,
            getIds: get,
            getIdString: getString
        }
    })
    .factory('ResultItemsMtrHelper', function ($meteor) {
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

        return {
            searchWithItemIds: search
        }
    })
    .factory('SavedSearchesMtrHelper', function ($meteor) {
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
    })
    /*
        Array of AWS 'response group' keys to reach desired value to be used with AwsResultsService.
        E.g. Request > IsValid => "True", so { isValid: "True" }
        Note: Assumes root is accounted for (ItemLookupRequest > Items).
     */
    .value('RequestResponseGroupTrees', {
        isValid: ['Request', 'IsValid'],
        errors: ['Request', 'Errors', 'Error'],
        itemIds: ['Request', 'ItemLookupRequest', 'ItemId']
    })
    .value('ItemResponseGroupTrees', {
        name: ['Item', 'ItemAttributes', 'Title'],
        listPrice: ['Item', 'ItemAttributes', 'ListPrice', 'FormattedPrice'],
        department: ['Item', 'ItemAttributes', 'Department'],
        productGroup: ['Item', 'ItemAttributes', 'ProductGroup'],
        productType: ['Item', 'ItemAttributes', 'ProductTypeName'],
        upc: ['Item', 'ItemAttributes', 'UPC'],
        newCount: ['Item', 'OfferSummary', 'TotalNew']
    })
    .controller('LookupController',
    function ($scope, $window, $filter, ResultItemsMtrHelper, SavedSearchesMtrHelper,
              IdService, AwsResultsService, ItemResponseGroupTrees, RequestResponseGroupTrees) {
        var self = this;
        self.MtrResults = $scope.$meteorCollection(ResultItems);
        self.codePrint = {}; // for debugging

        var papaConfig = {
            complete: parseSuccess,
            error: parseError
        };

        function parseSuccess(results, file) {
            console.log('Parse success');
            angular.forEach(results.data, function (idRow) {
                IdService.saveIds(idRow);
            });
            console.log('Saved IDs: ' + IdService.getIds());
            self.codePrint['Parse complete'] = results;
            self.fileStatus = 1;
            clearUpload();

            var itemIds = IdService.getIdString();

            ResultItemsMtrHelper.searchWithItemIds(itemIds, function successSearch(data) {
                self.codePrint['Query success!'] = true;
                debugFormat();
            });
        }

        function debugFormat() {
            self.MtrResults.forEach(function (obj, idx, arr) {
                angular.forEach(obj, function (value, key) {
                    self.codePrint[key] = value;
                });  // for debugging
            });
        }

        function parseError(error, file) {
            console.log('Parse error:' + error);
            self.file = null;
            self.codePrint['Parse error'] = error;
            self.fileStatus = -1;
        }

        self.upload = function uploadAndParseFile() {
            _Papa.parse(self.file, papaConfig);
        };

        self.clearUpload = clearUpload;
        function clearUpload() {
            $scope.$broadcast('clearFileFromUploader');
            self.file = null;
        }

        self.fileStatus = 0;
        self.fileChanged = function () {
            self.fileStatus = 0;
        };

        self.submit = function () {
            var itemIds = _itemIds;
            ResultItemsMtrHelper.searchWithItemIds(itemIds, function successSearch(data) {
                self.codePrint['Query success!'] = true;
                debugFormat();
            });
        };

        // TODO: better name or remove button?
        self.clicked = function showClicked() {
            parseResultsFromDb();
        };

        /**
         * Read in AWS responses from database and parse to get desired values for output.
         * Saves each search (with one or many item IDs) in database.
         */
        function parseResultsFromDb() {
            self.results = '';
            if (!self.MtrResults.length) {
                return;
            }

            var validRequest = true;
            angular.forEach(self.MtrResults, function (resultData, index) { // array
                var responseItems = resultData['Items'];

                // Check validity
                validRequest = AwsResultsService.findValue(responseItems, angular.copy(RequestResponseGroupTrees.isValid));
                var errorList = AwsResultsService.findValue(responseItems, angular.copy(RequestResponseGroupTrees.errors));
                var requestIds = AwsResultsService.findValue(responseItems, angular.copy(RequestResponseGroupTrees.itemIds));


                // TODO: errors come back as object if only 1, need to treat different cases
                var hasValidResults = false;
                if (!angular.isArray(errorList)) {
                    var error = {
                        Code: errorList.Code,
                        Message: errorList.Message
                    }
                }

                if (validRequest === 'True' && requestIds.length > errorList.length) {
                    var foundValues = {};
                    angular.forEach(ItemResponseGroupTrees, function (valTree, valToFind) {
                        foundValues[valToFind] = AwsResultsService.findValue(responseItems, angular.copy(valTree));
                    });
                    // TODO: redundantly saving searches? pass in UPC as ID
                    SavedSearchesMtrHelper.saveSearch(foundValues);

                    var showHeader = index === 0;
                    self.results += AwsResultsService.convertToCsv(foundValues, showHeader);
                } else if (validRequest !== 'True') {
                    console.warn('Invalid AWS request!');
                } else if (requestIds.length <= errorList.length) {
                    console.warn('All IDs have AWS errors: ');

                    angular.forEach(errorList, function (err) { // Array
                        if (err.Code && err.Message) {
                            console.warn(err.Code + ': ' + err.Message);
                        } else {
                            console.warn(err);
                        }
                    });
                }
            });

            /*self.MtrResults.forEach(function(obj, idx, arr) { // should only run once
             var foundValues = {};
             var itemData = self.MtrResults[idx]['Items'];

             // If AWS request was valid, parse response.
             var valuesToFind = ItemResponseGroupTrees;
             for (var val in valuesToFind) {
             foundValues[val] = AwsResultsService.findValue(itemData, angular.copy(valuesToFind[val]));
             }

             // TODO : replace with helper service
             $meteor.call('saveSearch', Date.now(), foundValues).then(
             function success(data) {
             console.log('saveSearch success!');
             },
             function error(err) {
             console.log('saveSearch error: ' + err);
             }
             );
             self.results += AwsResultsService.convertToCsv(foundValues, idx == 0);
             });*/
        }

        /**
         * Encodes the string results and triggers a download.
         * Names file after localized date/time.
         */
        self.download = function downloadFile() {
            var encodedUri = encodeURIComponent(self.results);
            var elem = document.createElement('a');
            elem.href = 'data:attachment/csv,' + encodedUri;
            elem.target = '_blank';
            var dateTime = $filter('date')(Date.now(), 'yyyy-MMM-dd_hh-mm');
            elem.download = dateTime + '__Results.csv';

            document.body.appendChild(elem);
            elem.click();
        };
    }) // end controller

    // TODO: move to separate file
    .factory('AwsResultsService', [function () {
        /**
         * Recursively searches through object/array until either last element in searchPropList is reached
         * or until null
         * @param searchObj object to search through
         * @param searchPropList list of properties to go through to get to value (hierarchy)
         * @returns found value in object
         */
        function findValueInternal(searchObj, searchPropList) {
            if (!searchObj) { // Result not found
                return null;
            }
            if (!searchPropList || searchPropList.length === 0) { // Result found or invalid list
                if (Array.isArray(searchObj) && searchObj.length === 1) {
                    return searchObj[0];
                }
                return searchObj;
            }
            var firstProperty = searchPropList.splice(0, 1)[0]; // Remove first object
            if (Array.isArray(searchObj)) { // Keep searching through array-wrapped object
                return findValueInternal(searchObj[0][firstProperty], searchPropList);
            }
            // Keep searching thru object
            return findValueInternal(searchObj[firstProperty], searchPropList);
        }

        /**
         * Converts all values into CSV string. Uses keys as header.
         * Values must be primitive types.
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
            // convert to forEach? what's more performant? is this null safe?
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
