(function (angular) {
    'use strict';

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
        lowestNewPrice: ['OfferSummary', 'LowestNewPrice', 'FormattedPrice'],
        department: ['ItemAttributes', 'Department'],
        productGroup: ['ItemAttributes', 'ProductGroup'],
        newCount: ['OfferSummary', 'TotalNew'],
        salesRank: ['SalesRank']
    });

    module.value('ResponseGroupUrls', {
        upc: 'http://docs.aws.amazon.com/AWSECommerceService/latest/DG/CHAP_response_elements.html#UPC',
        name: 'http://docs.aws.amazon.com/AWSECommerceService/latest/DG/CHAP_response_elements.html#Title',
        listPrice: 'http://docs.aws.amazon.com/AWSECommerceService/latest/DG/CHAP_response_elements.html#ListPrice',
        lowestNewPrice: 'http://docs.aws.amazon.com/AWSECommerceService/latest/DG/CHAP_response_elements.html#FormattedPrice',
        department: 'http://docs.aws.amazon.com/AWSECommerceService/latest/DG/CHAP_response_elements.html#Department',
        productGroup: 'http://docs.aws.amazon.com/AWSECommerceService/latest/DG/CHAP_response_elements.html#ProductGroup',
        newCount: 'http://docs.aws.amazon.com/AWSECommerceService/latest/DG/CHAP_response_elements.html#TotalNew',
        salesRank: 'http://docs.aws.amazon.com/AWSECommerceService/latest/DG/RG_SalesRank.html'
    });

    module.controller('LookupController',
        ['$scope', '$q', 'MeteorHelperService', 'CsvService', 'StatusService', 'FileDownloadService',
            'IdService', 'PapaParseService', 'ResponseGroupService', 'ItemResponseGroupTrees',
            'RequestResponseGroupTrees', 'ResponseGroupUrls',
            function ($scope, $q, MeteorHelperService, CsvService, StatusService, FileDownloadService,
                      IdService, PapaParseService, ResponseGroupService, ItemResponseGroupTrees,
                      RequestResponseGroupTrees, ResponseGroupUrls) {
                var self = this;
                self.idsQueue = [];
                self.file = null;
                self.results = '';
                self.uploaded = false;
                self.disableSubmit = true;
                self.responseGroupUrls = ResponseGroupUrls;

                self.account = {};

                $scope.$watch(function watchAwsAccountInfo() {
                    return self.account;
                }, function requireAccountForSubmit() {
                    self.disableSubmit = !(self.account.id || self.account.secretKey || self.account.associateTag);
                });

                // CLEAR ALL
                self.clearClicked = function clearAllData() {
                    $scope.$broadcast('clearFileFromUploader');
                    StatusService.clear();
                    self.file = null;
                    self.idsQueue = []; // All new queue
                    self.uploaded = false;
                    self.disableSubmit = true;
                };

                // UPLOAD
                self.upload = function uploadAndParseFile() {
                    self.idsQueue = [];
                    StatusService.clear();
                    self.results = '';
                    PapaParseService.parse(self.file)
                        .then(fileParseSuccess, fileParseError);
                };

                // FILE PARSE
                function fileParseSuccess(results) {
                    var idList = IdService.findIds(results.data);
                    var idCount = idList.length; // Save before slice

                    while (idList.length > 0) {
                        var savedIds = idList.splice(0, 10); // Only 10 per AWS request
                        self.idsQueue.push(savedIds.toString());
                    }
                    StatusService.logInfo('"' + self.file.name + '" parsed. Values found: ' + idCount);
                    self.uploaded = true;
                    self.disableSubmit = false;
                }

                function fileParseError(error) {
                    self.idsQueue = []; // All new queue
                    StatusService.logError('File parse error: "' + error + '"');
                    self.uploaded = false;
                    self.file = null;
                }

                // FILE MODIFIED
                self.fileChanged = function () {
                    self.uploaded = false;
                };
                function clearUpload() {
                    $scope.$broadcast('clearFileFromUploader');
                    self.file = null;
                    self.uploaded = false;
                }

                // FILE REQUEST SUBMIT

                /**
                 * Do all AWS requests, clear the form, then handle results when all requests are complete.
                 */
                self.submit = function doAwsRequestWithIds() {
                    clearUpload();
                    if (!self.idsQueue) return;
                    StatusService.logInfo('AWS requests needed (max 10 UPCs per request): ' + self.idsQueue.length);

                    var deferred = $q.defer();
                    doAllRequests(self.idsQueue, deferred, {success: [], errors: []});

                    var requestPromise = deferred.promise;
                    requestPromise.then(function success(results) {
                        parseResultsFromDb(results);
                        self.disableSubmit = true;
                    });
                };

                function doAllRequests(requestQueue, deferred, resultData) {
                    var requestIds = requestQueue.splice(0, 1); // get one element from queue
                    MeteorHelperService.searchWithItemIds(requestIds.toString(), self.account).then(
                        function successSearch(data) {
                            data && resultData.success.push(data);

                            if (requestQueue == 0) {
                                deferred.resolve(resultData);
                            } else {
                                doAllRequests(requestQueue, deferred, resultData);
                            }
                        }, function errorSearch(errData) {
                            resultData.errors.push(errData);
                            StatusService.logError(errData.errorType + ' - ' + errData.error, errData);
                            if (requestQueue == 0) {
                                deferred.resolve(resultData);
                            } else {
                                doAllRequests(requestQueue, deferred, resultData);
                            }
                        });
                }

                /**
                 * Read in AWS responses from database and parse to get desired values for output.
                 */
                function parseResultsFromDb(completeResults) {
                    self.results = '';
                    var resultCount = 0;
                    if (!completeResults.success.length && !completeResults.errors.length) {
                        // Will happen if parse checked before server is complete or if AWS credentials incomplete.
                        StatusService.logWarning('No results found.');
                        return;
                    }

                    angular.forEach(completeResults.success, function eachRequestResponse(response, responseIdx) {
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
                                StatusService.logSuccess('AWS request #' + requestNumber + ' complete.');
                            }
                        } else {
                            StatusService.logError('AWS request #' + requestNumber + ' invalid.');
                        }
                    });

                    if (resultCount) {
                        StatusService.logSuccess('Total successful item results: ' + resultCount);
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

                // DOWNLOAD COMPLETE TRANSFORMED RESULTS
                self.download = function () {
                    FileDownloadService.triggerDownload(self.results);
                };

                self.getIds = function () {
                    return self.idsQueue.toString();
                }
            }]); // end controller
})(window.angular);
