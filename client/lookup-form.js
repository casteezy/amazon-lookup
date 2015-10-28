(function (angular) {
    'use strict';

    var module = angular.module('amazonLookup');

    module.controller('LookupController',
        function ($scope, $meteor, $window, $filter, $q, PapaParseService, ResultItemsMtrHelper, CsvService, StatusService,
                  IdService, ResponseGroupService, ItemResponseGroupTrees, RequestResponseGroupTrees) {
            var self = this;
            self.MtrResults = $scope.$meteorCollection(ResultItems);
            self.idsQueue = [];
            //self.uploaded = false;
            self.file = null;
            self.results = '';
            self.disableSubmit = true;

            self.fileChanged = function () {
                //self.uploaded = false;
            };

            function clearUpload() {
                $scope.$broadcast('clearFileFromUploader');
                self.file = null;
                //self.uploaded = false;
            }

            self.clearUpload = clearAll;
            function clearAll() {
                $scope.$broadcast('clearFileFromUploader');
                StatusService.clear();
                //self.uploaded = false;
                self.file = null;
                self.idsQueue = []; // All new queue
            }

            self.upload = function uploadAndParseFile() {
                self.idsQueue = [];
                StatusService.clear();
                self.results = '';
                PapaParseService.parse(self.file).then(function fileParseSuccess(results) {
                    var idList = IdService.findIds(results.data);
                    var idCount = idList.length; // Save before slice

                    while (idList.length > 0) {
                        var savedIds = idList.splice(0, 10); // Only 10 per AWS request
                        self.idsQueue.push(savedIds.toString());
                    }
                    StatusService.logInfo('"' + self.file.name + '" parsed. UPCs: ' + self.idsQueue.toString());
                    //self.uploaded = true;
                    $scope.$broadcast('clearFileFromUploader');
                    self.file = null;
                    self.disableSubmit = false;
                }, function fileParseError(error) {
                    self.idsQueue = []; // All new queue
                    StatusService.logError('File parse error: "' + error + '"');
                    //self.uploaded = false;
                    self.file = null;
                });
            };

            /**
             * Do all AWS requests, clear the form, then handle results when all requests are complete.
             */
            self.submit = function doAwsRequestWithIds() {
                self.disableSubmit = true;
                clearUpload();
                if (!self.idsQueue) return;
                StatusService.logInfo('AWS requests needed (max 10 UPCs per request): ' + self.idsQueue.length);

                var deferred = $q.defer();
                doAllRequests(self.idsQueue, deferred);
                var requestPromise = deferred.promise;
                requestPromise.then(function success() {
                    parseResultsFromDb();
                    ResultItemsMtrHelper.clearResults(function success() {
                        self.idsQueue = [];
                    });
                });
            };

            /**
             * Does a search per each element in the requestQueue array.
             * @param requestQueue list of elements to do a search with
             * @param deferred to resolve once completed
             * @return promise, to be resolved when all searches are successful
             */
            function doAllRequests(requestQueue, deferred) {
                var requestIds = requestQueue.splice(0, 1); // one element
                ResultItemsMtrHelper.searchWithItemIds(requestIds.toString())
                    .then(function successSearch(data) {
                        if (requestQueue == 0) {
                            deferred.resolve(data);
                        } else {
                            doAllRequests(requestQueue);
                        }
                    }, function errorSearch(err) {
                        StatusService.logError('Request error: "' + err + '"');
                        if (requestQueue == 0) {
                            // Should the search stop if one AWS request fails?
                            deferred.reject(err);
                        } else {
                            doAllRequests(requestQueue);
                        }
                    });
            }

            /**
             * Read in AWS responses from database and parse to get desired values for output.
             */
            function parseResultsFromDb() {
                self.results = '';
                var resultCount = 0;
                if (!self.MtrResults.length) {
                    // Will happen if parse checked before server is complete or if AWS credentials incomplete.
                    StatusService.logWarning('No results found.');
                    return;
                }

                angular.forEach(self.MtrResults, function eachRequestResponse(response, responseIdx) {
                    var requestNumber = responseIdx + 1;
                    var isFirstResponse = responseIdx === 0;
                    var responseItems = response['Items'];
                    StatusService.logInfo('Parsing response for AWS request #' + requestNumber + '...');

                    // Check validity
                    var validRequest = ResponseGroupService.findValue(responseItems,
                        angular.copy(RequestResponseGroupTrees.isValid));
                    var errors = ResponseGroupService.findValue(responseItems,
                        angular.copy(RequestResponseGroupTrees.errors));
                    var requestIds = ResponseGroupService.findValue(responseItems,
                        angular.copy(RequestResponseGroupTrees.itemIds));

                    // AWS request can be valid but have errors.
                    handleErrors(errors, requestIds);
                    if (validRequest === 'True') {
                        //StatusService.logInfo('AWS request #' + (responseIdx + 1) + ' valid.');

                        var singleErrorAndId = !angular.isArray(requestIds) && !angular.isArray(errors);
                        var allIdsHaveErrors = angular.isArray(requestIds) && angular.isArray(errors)
                            && (requestIds.length === errors.length);
                        if (singleErrorAndId || allIdsHaveErrors) {
                            StatusService.logWarning('No successful AWS results for request #' + requestNumber);
                        } else {
                            angular.forEach(responseItems[0]['Item'], function eachItemFound(item, itemIdx) { // array
                                resultCount++;
                                var result = ResponseGroupService.findValues(item, ItemResponseGroupTrees);
                                self.results += CsvService.convertToCsv(result, isFirstResponse && itemIdx == 0);
                            });
                        }
                    } else {
                        StatusService.logError('AWS request #' + requestNumber + ' invalid.');
                    }
                });

                if (resultCount) {
                    StatusService.logInfo('Total successful item results found: ' + resultCount);
                } else {
                    StatusService.logWarning('Total results found: 0');
                }
            }

            function handleErrors(errors, ids) {
                if (!errors) return;
                if (!angular.isArray(errors)) {
                    StatusService.logWarning('Response contains 1 error out of ' + ids.length + ' UPCs...');
                    logError(errors)
                } else if (angular.isArray(errors)) {
                    StatusService.logWarning('Response contains ' + errors.length + ' errors out of ' +
                        ids.length + ' UPCs...');
                    angular.forEach(errors, function (err) {
                        logError(err)
                    });
                }
            }

            function logError(errors) {
                var errMessage = ResponseGroupService.findValue(errors, ['Code']);
                errMessage += ': ' + ResponseGroupService.findValue(errors, ['Message']);
                StatusService.logError('"' + errMessage + '"');
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
                var dateTime = $filter('date')(Date.now(), 'yyyy-MMM-dd_HH-mm');
                elem.download = dateTime + '__Results.csv';

                document.body.appendChild(elem);
                elem.click();
            };
        }); // end controller

})(window.angular, window.Papa);
