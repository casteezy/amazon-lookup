// Mock object
var Parse = {
    initialize: function (a, b) {
    }
};

'use strict';
angular.module('cms').factory('parseInit', [function () {
// Required to use the SDK.
    Parse.initialize(applicationKey, javascriptKey);
// Methods
    return {
        CreateRepository: function (className) {
            var objectClass = Parse.Object.extend(className, {}, {
                all: function () {
                    var query = new Parse.Query(objectClass);
                    query.limit(1000);
                    return query.find({
                        success: function (results) {
                            return results;
                        }, error: function (e) {
                            return e;
                        }
                    });
                }, count: function () {
                    var query = new Parse.Query(objectClass);
                    query.ascending('objectId');
                    return query.count({
                        success: function (result) {
                            return result;
                        }, error: function (e) {
                            return e;
                        }
                    });
                }, get: function (id) {
                    var query = new Parse.Query(objectClass);
                    return query.get(id, {
                        success: function (result) {
                            return result;
                        }, error: function (e) {
                            return e;
                        }
                    });
                }, save: function (obj) {
                    return obj.save(null, {
                        success: function (result) {
                            return result;
                        }, error: function (object, e) {
                            return e;
                        }
                    });
                }, delete: function (obj) {
                    return obj.destroy(null, {
                        success: function (result) {
                            return;
                        }, error: function (e) {
                            return e;
                        }
                    });
                }, create: function () {
                    return new objectClass();
                }
            });
            return objectClass;
        },
        get: function (id) {
            var defer = $q.defer();
            // Create a deferring object
            var query = new Parse.Query(objectClass);
            query.get(id, {
                success: function (result) {
                    defer.resolve(result);
                }, error: function (error) {
                    defer.reject(error);
                }
            });
            return defer.promise; // Create an Angular promise to be resolved
        },
        save: function (obj) {
            var defer = $q.defer();
            obj.save(null, {
                success: function (result) {
                    defer.resolve(result);
                }, error: function (object, error) {
                    defer.reject(error);
                }
            });
            return defer.promise;
        }
    };
}]);

angular.module('cms').factory('someService', ['parseInit', function (parseInit) {
    var Class = parseInit.CreateRepository('ClassName');
    // Optionally add or delete methods as necessary.
    delete Class.count;
    Class.aNewMethod = function () {
    };
    return Class;
}]);

angular.module('cms').controller('DashboardCtrl', ['$scope', 'someService', function ($scope, someService) {
    $scope.someList = [];
    // Initialization
    someService.all().then(function success(result) {
        $scope.someList = result;
    }, function error(error) {
    })
}]);