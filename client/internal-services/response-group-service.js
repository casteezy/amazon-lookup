(function (angular) {
    'use strict';

    angular.module('amazonLookup')
    /**
     * Find a value from data converted from XML to JSON.
     * All objects and primitive values are wrapped in an array.
     */
    .factory('ResponseGroupService', [function () {
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
    }]);

})(window.angular);
