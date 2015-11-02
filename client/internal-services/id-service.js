(function(angular) {
    'use strict';

    angular.module('amazonLookup')
    .factory('IdService', function () {
        /**
         * Get all IDs from an object with arrays or primitive values.
         */
        function findIds(data) {
            var idList = [];
            angular.forEach(data, function (idRow) { // array
                if (angular.isArray(idRow)) {
                    angular.forEach(idRow, function getSingleId(id) {
                        idList.push(id);
                    });
                } else {
                    // can have one ID per row
                    idList.push(idRow);
                }
            });
            return idList;
        }

        return {
            findIds: findIds
        }
    });

})(window.angular);