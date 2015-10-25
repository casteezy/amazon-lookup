var module = angular.module('amazonLookup');

/*
 Array of AWS 'response group' keys to reach desired value to input into ResponseGroupService.
 E.g. Request > IsValid => "True", so { isValid: "True" }
 Note: Assumes root is accounted for (ItemLookupRequest > Items).
 */
module.value('RequestResponseGroupTrees', {
    isValid: ['Request', 'IsValid'],
    errors: ['Request', 'Errors', 'Error'],
    itemIds: ['Request', 'ItemLookupRequest', 'ItemId']
});

/*
 Array of AWS 'response group' keys to reach desired value to input into ResponseGroupService.
 Note: Assumes root is accounted for (ItemLookupRequest > Items > Item).
 */
module.value('ItemResponseGroupTrees', {
    upc: ['ItemAttributes', 'UPC'],
    name: ['ItemAttributes', 'Title'],
    listPrice: ['ItemAttributes', 'ListPrice', 'FormattedPrice'],
    department: ['ItemAttributes', 'Department'],
    productGroup: ['ItemAttributes', 'ProductGroup'],
    productType: ['ItemAttributes', 'ProductTypeName'],
    newCount: ['OfferSummary', 'TotalNew']
});

module.controller('LookupController',
    function ($scope, $window, $filter, $q, ResultItemsMtrHelper, SavedSearchesMtrHelper, StatusService,
              IdService, ResponseGroupService, ItemResponseGroupTrees, RequestResponseGroupTrees,
              CsvService) {
        var self = this;
        self.MtrResults = $scope.$meteorCollection(ResultItems);
        self.codePrint = {}; // for debugging
        self.fileStatus = 0;
        self.clearUpload = clearUpload;
        //self.itemIdStr = '';
        var idsQueue = [];
        var _Papa = Papa; // external library

        var papaConfig = {
            complete: function fileParseSuccess(results, file) {
                var idList = IdService.findIds(results.data);
                var idCount = idList.length;

                while (idList.length > 0) {
                    var savedIds = idList.splice(0, 10); // only 10 per AWS request
                    idsQueue.push(savedIds.toString());
                }

                //self.itemIdStr = IdService.getIdString();
                self.fileStatus = 1;
                clearUpload();

                StatusService.logSuccess('File parse success! ID count from file: ' + idCount);
            },
            error: function fileParseError(error, file) {
                StatusService.logError('File parse error: "' + error + '"');
                self.file = null;
                self.fileStatus = -1;
            }
        };

        self.upload = function uploadAndParseFile() {
            StatusService.clear();
            IdService.resetIds();
            idsQueue = [];
            _Papa.parse(self.file, papaConfig);
        };

        function clearUpload() {
            $scope.$broadcast('clearFileFromUploader');
            self.file = null;
        }

        self.fileChanged = function () {
            self.fileStatus = 0;
        };

        self.submit = function doAwsRequestWithIds() {
            StatusService.logInfo('AWS requests needed: ' + idsQueue.length);
            var deferred = $q.defer();
            var completed = 0;
            angular.forEach(idsQueue, function(idString, idx) {
                ResultItemsMtrHelper.searchWithItemIds(idString, function successSearch(data) {
                    completed++;
                    if (completed == idsQueue.length) {
                        deferred.resolve();
                    }
                }, function errorSearch(err) {
                    StatusService.logError('Request error: "' + err + '"');
                    ResultItemsMtrHelper.clearResults();
                    completed++;
                    if (completed == idsQueue.length) {
                        deferred.resolve();
                    }
                });
            });
            deferred.promise.then(function success() {
                parseResultsFromDb();
            });
        };

        /**
         * Read in AWS responses from database and parse to get desired values for output.
         * Saves each search (with one or many item IDs) in database.
         */
        function parseResultsFromDb() {
            self.results = '';
            if (!self.MtrResults.length) {
                // TODO Why would no results come back?
                StatusService.logWarning('No results found.');
                return;
            }

            angular.forEach(self.MtrResults, function eachRequestResponse(response, index) {
                StatusService.logInfo('Parsing AWS response for request #' + (index + 1));
                var isFirstResponse = index === 0;
                var responseItems = response['Items'];

                // Check validity
                var validRequest = ResponseGroupService.findValue(responseItems,
                    angular.copy(RequestResponseGroupTrees.isValid));
                var errors = ResponseGroupService.findValue(responseItems,
                    angular.copy(RequestResponseGroupTrees.errors));
                var requestIds = ResponseGroupService.findValue(responseItems,
                    angular.copy(RequestResponseGroupTrees.itemIds));

                // AWS request can be valid but have errors.
                handleErrors(errors);
                if (validRequest === 'True') {
                    StatusService.logInfo('AWS request #' + (index + 1) + ' valid.');

                    var singleErrorAndId = !angular.isArray(requestIds) && !angular.isArray(errors);
                    var allIdsHaveErrors = angular.isArray(requestIds) && angular.isArray(errors)
                        && (requestIds.length === errors.length);
                    if (singleErrorAndId || allIdsHaveErrors) {
                        StatusService.logWarning('No successful AWS results.');
                    } else {
                        angular.forEach(responseItems[0]['Item'], function(item, itemIdx) { // array
                            var result = ResponseGroupService.findValues(item, ItemResponseGroupTrees);
                            self.results += CsvService.convertToCsv(result, isFirstResponse && itemIdx == 0);
                        });
                    }
                } else {
                    StatusService.logError('AWS request #' + (index + 1) + ' invalid.');
                }
            });

            if (self.results) {
                StatusService.logSuccess('AWS results found and ready for download.');
            }
            // Clear from db
            ResultItemsMtrHelper.clearResults();
        }

        function handleErrors(errors) {
            if (!errors) return;
            StatusService.logWarning('AWS request error(s) found...');
            if (!angular.isArray(errors)) {
                logError(errors)
            } else if (angular.isArray(errors)) {
                angular.forEach(errors, function (err) {
                    logError(err)
                });
            }
        }

        function logError(errors) {
            var errMessage = ResponseGroupService.findValue(errors, ['Code']);
            errMessage += ': ' + ResponseGroupService.findValue(errors, ['Message']);
            StatusService.logError(errMessage);
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
