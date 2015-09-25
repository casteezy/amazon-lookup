// CLIENT SIDE
if (Meteor.isClient) {
    var module = angular.module('amazonLookup', ['angular-meteor']);

    module.controller('lookupCtrl', ['$scope',
        function ($scope) {
            var vm = this;
            vm.title = 'Amazon Item Lookup by UPC';
        }]);

}


// SERVER SIDE
if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
    });
}
