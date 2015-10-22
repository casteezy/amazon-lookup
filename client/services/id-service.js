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
            }
        }

        /**
         * Get copy of ID array.
         */
        function get() {
            return angular.copy(savedIds);
        }

        /**
         * Get ID array as CSV string.
         */
        function getString() {
            return savedIds.toString();
        }

        return {
            resetIds: reset,
            saveIds: save,
            getIds: get,
            getIdString: getString
        }
    });