angular.module('amazonLookup')
    /**
     * Saves and manages array of IDs.
     */
    .factory('IdService', function () {
        var savedIds = [];

        /**
         * Clear all IDs in array;
         */
        function reset() {
            savedIds = [];
        }

        /**
         * Save array of IDs into existing array
         */
        function save(itemIds) {
            if (Array.isArray(itemIds)) {
                Array.prototype.push.apply(savedIds, itemIds);
            } else if (angular.isString(itemIds)) {
                savedIds.push(itemIds);
            }
        }

        /**
         * Get copy of ID array.
         */
        function get() {
            return savedIds;
        }

        /**
         * Get ID array as CSV string.
         */
        function getString() {
            return savedIds.toString();
        }

        function findIds(data) {
            var idList = [];
            angular.forEach(data, function (idRow) { // array
                if (angular.isArray(idRow)) {
                    angular.forEach(idRow, function(id) {
                        idList.push(id);
                    });
                } else {
                    // can have one ID per row
                    idList.push(idRow);
                }
            });
            return idList;
        }

        var list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        var x = list.splice(0, 10);

        return {
            resetIds: reset,
            saveId: save,
            getIds: get,
            getIdString: getString,
            findIds: findIds
        }
    });