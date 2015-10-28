(function (angular) {
    'use strict';

    var module = angular.module('awsResponseGroupHelpers', []);

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
        productType: ['ItemAttributes', 'ProductTypeName'],
        newCount: ['OfferSummary', 'TotalNew']
    });


    /**
     * Find a value from data converted from XML to JSON.
     * All objects and primitive values are wrapped in an array.
     */
    module.factory('ResponseGroupService', function () {
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
         * Search through item given an object/list of response group trees.
         * Return results as an object.
         */
        function findValues(item, responseGroups) {
            var result = {};
            angular.forEach(responseGroups, function (valTree, valToFind) {
                result[valToFind] = findValueInternal(item, angular.copy(valTree));
            });
            return result;
        }

        return {
            findValue: findValueInternal,
            findValues: findValues
        };
    });

})(window.angular);
