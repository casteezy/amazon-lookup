// TODO: use File uploaded data instead. DELETE ME.
var _itemIds = '075691002589,815150018092';  // Tape measure, 2 pack tumblers

/**
 * Papa Parse - http://papaparse.com/
 */
var _Papa = Papa;

// TODO: prefix all with module
var module = angular.module('amazonLookup');

/*
 Array of AWS 'response group' keys to reach desired value to input into AwsResultsService.
 E.g. Request > IsValid => "True", so { isValid: "True" }
 Note: Assumes root is accounted for (ItemLookupRequest > Items).
 */
module.value('RequestResponseGroupTrees', {
    isValid: ['Request', 'IsValid'],
    errors: ['Request', 'Errors', 'Error'],
    itemIds: ['Request', 'ItemLookupRequest', 'ItemId']
});

module.value('ItemResponseGroupTrees', {
    name: ['Item', 'ItemAttributes', 'Title'],
    listPrice: ['Item', 'ItemAttributes', 'ListPrice', 'FormattedPrice'],
    department: ['Item', 'ItemAttributes', 'Department'],
    productGroup: ['Item', 'ItemAttributes', 'ProductGroup'],
    productType: ['Item', 'ItemAttributes', 'ProductTypeName'],
    upc: ['Item', 'ItemAttributes', 'UPC'],
    newCount: ['Item', 'OfferSummary', 'TotalNew']
});

module.controller('LookupController',
    function ($scope, $window, $filter, ResultItemsMtrHelper, SavedSearchesMtrHelper, StatusService,
              IdService, AwsResultsService, ItemResponseGroupTrees, RequestResponseGroupTrees) {
        var self = this;
        self.MtrResults = $scope.$meteorCollection(ResultItems);
        self.codePrint = {}; // for debugging
        self.fileStatus = 0;
        self.clearUpload = clearUpload;

        var papaConfig = {
            complete: fileParseSuccess,
            error: fileParseError
        };

        function fileParseSuccess(results, file) {
            StatusService.logSuccess('File parse success!');

            angular.forEach(results.data, function (idRow) {
                IdService.saveIds(idRow);
            });
            StatusService.logInfo('Parsed IDs from file: ' + IdService.getIds());
            StatusService.logInfo('File parse results: ' + results);
            self.fileStatus = 1;
            clearUpload();

            var itemIds = IdService.getIdString();
            ResultItemsMtrHelper.searchWithItemIds(itemIds, function successSearch(data) {
                StatusService.logSuccess('ResultItems method successful');
                debugFormat();
            }, function errorSearch(err) {
                StatusService.logError('ResultItems method failed: ' + err);
            });
        }

        function debugFormat() {
            self.MtrResults.forEach(function (obj, idx, arr) {
                angular.forEach(obj, function (value, key) {
                    self.codePrint[key] = value;
                });  // for debugging
            });
        }

        function fileParseError(error, file) {
            StatusService.logError('File parse error:' + error);
            self.file = null;
            self.fileStatus = -1;
        }

        self.upload = function uploadAndParseFile() {
            StatusService.clear();
            _Papa.parse(self.file, papaConfig);
        };

        function clearUpload() {
            $scope.$broadcast('clearFileFromUploader');
            self.file = null;
        }

        self.fileChanged = function () {
            self.fileStatus = 0;
        };

        self.submit = function () {
            var itemIds = _itemIds;
            ResultItemsMtrHelper.searchWithItemIds(itemIds, function successSearch(data) {
                //self.codePrint['Query success!'] = true;
                StatusService.logSuccess('ResultItems method successful');
                debugFormat();
            }, function errorSearch(error) {
                StatusService.logError('ResultItems method error ' + error);
            });
        };

        // TODO: better name or remove button?
        self.clicked = function showClicked() {
            parseResultsFromDb();
        };

        function logRequestErrors(errorList) {
            var hasError = false;
            if (errorList) {
                if (!angular.isArray(errorList)) {
                    var errMessage = AwsResultsService.findValue(errorList, ['Code']);
                    errMessage += ': ' + AwsResultsService.findValue(errorList, ['Message']);
                    StatusService.logError('AWS Request Error - "' + errMessage + '"');
                    hasError = true;
                } else {
                    angular.forEach(errorList, function (err) {
                        var errMessage = AwsResultsService.findValue(err, ['Code']);
                        errMessage += ': ' + AwsResultsService.findValue(err, ['Message']);
                        StatusService.logError('AWS Request Error - "' + errMessage + '"');
                    });
                    hasError = errorList.length > 0;
                }
            }
            return hasError;
        }

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

                var hasErrors = logRequestErrors(errorList);

                /*
                 TODO: handle errors AND validation

                 valid:
                 - validRequest === 'True', errorList as array is empty
                 - validRequest === 'True', errorList as object or primitive is falsy
                 - validRequest === 'True', as arrays, errorList.length < requestIds.length
                 - validRequest === 'True', as arrays,
                    errorList as object or primitive is truthy AND requestIds is array length > 0
                 - validRequest === 'True', as arrays,
                 errorList as object or primitive is truthy AND requestIds is array length > 0
                 */

                if (validRequest === 'True' && !hasErrors) {
                    StatusService.logSuccess('AWS request valid and successful!');
                    var foundValues = {};
                    angular.forEach(ItemResponseGroupTrees, function (valTree, valToFind) {
                        foundValues[valToFind] = AwsResultsService.findValue(responseItems, angular.copy(valTree));
                    });
                    var showHeader = index === 0;
                    self.results += AwsResultsService.convertToCsv(foundValues, showHeader);

                } else if (validRequest === 'True' && angular.isArray(requestIds)
                        && angular.isArray(errorList) && (requestIds.length > errorList.length)) {
                    var foundValues = {};
                    angular.forEach(ItemResponseGroupTrees, function (valTree, valToFind) {
                        foundValues[valToFind] = AwsResultsService.findValue(responseItems, angular.copy(valTree));
                    });
                    // TODO: redundantly saving searches? pass in UPC as ID
                    //SavedSearchesMtrHelper.saveSearch(foundValues);

                    var showHeader = index === 0;
                    self.results += AwsResultsService.convertToCsv(foundValues, showHeader);
                } else if (validRequest !== 'True') {
                    StatusService.logError('Invalid AWS request.');
                } else if (angular.isArray(requestIds) && angular.isArray(errorList)
                    && (requestIds.length <= errorList.length)) {
                    StatusService.logError('Unsuccessful item lookup...');

                    angular.forEach(errorList, function (err) { // Array
                        if (err.Code && err.Message) {
                            StatusService.logError(err.Code + ': ' + err.Message);
                        } else {
                            StatusService.logError(err);
                        }
                    });
                }
            });
            //StatusService.logInfo('CSV results: ' + self.results);

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
    }); // end controller
