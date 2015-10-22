angular.module('amazonLookup')
/**
 * Source:
 * http://odetocode.com/blogs/scott/archive/2013/07/05/a-file-input-directive-for-angularjs.aspx
 */
    .directive('fileInput', function ($parse) {
        return {
            restrict: 'EA',
            template: '<input type="file" accept=".csv" />',
            replace: true,
            link: function (scope, element, attrs) {

                var modelGet = $parse(attrs.fileInput);
                var modelSet = modelGet.assign;
                var onChange = $parse(attrs.onChange);

                var updateModel = function () {
                    scope.$apply(function () {
                        modelSet(scope, element[0].files[0]);
                        onChange(scope);
                    });
                };

                scope.$on('clearFileFromUploader', function () {
                    modelSet(scope, []);
                    element.val(null);
                });

                element.bind('change', updateModel);
            }
        };
    });