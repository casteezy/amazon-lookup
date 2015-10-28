(function(angular) {
    'use strict';

    /**
     * Set up angular module.
     */
    angular.module('amazonLookup', [
        'angular-meteor',
        'papaParse',
        'meteorHelpers',
        'awsResponseGroupHelpers'
    ]);

})(window.angular);