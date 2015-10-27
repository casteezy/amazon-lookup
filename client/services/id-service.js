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

        var savedIds = [];
        function queue(itemIds) {
            if (Array.isArray(itemIds)) {
                Array.prototype.push.apply(savedIds, itemIds);
            } else if (angular.isString(itemIds)) {
                savedIds.push(itemIds);
            }
        }

        function getQueue() {
            return savedIds;
        }

        function reset() {
            savedIds = [];
        }

        return {
            findIds: findIds,
            queue: queue,
            getQueue: getQueue,
            clear: reset
        }
    });

})(window.angular);