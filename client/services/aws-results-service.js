angular.module('amazonLookup')
/**
 * Parse and find data from results sent back from AWS.
 */
    .factory('AwsResultsService', function () {
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
    }); // end service
