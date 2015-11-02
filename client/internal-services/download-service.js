(function (angular) {
    'use strict';

    angular.module('fileDownload', [])
        /**
         * Encodes the string results and triggers a download.
         * Names file after localized date/time.
         */
        .factory('FileDownloadService', ['$filter', function($filter) {
            function triggerDownload(dataToOutput) {
                var encodedUri = encodeURIComponent(dataToOutput);
                var elem = document.createElement('a');
                elem.href = 'data:attachment/csv,' + encodedUri;
                elem.target = '_blank';
                var dateTime = $filter('date')(Date.now(), 'yyyy-MMM-dd_HH-mm');
                elem.download = dateTime + '__Results.csv';

                document.body.appendChild(elem);
                elem.click();
            }

            return {
                triggerDownload: triggerDownload
            }
        }]);

})(window.angular);