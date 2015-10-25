angular.module('amazonLookup')
    .factory('CsvService', function () {
        /**
         * Converts all values into CSV string. Uses keys as header.
         * Values must be primitive types (objects won't parse properly).
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
            return csvColumns + '\n' + csvOutput + '\n';
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
            convertToCsv: convertInternal
        };
    });