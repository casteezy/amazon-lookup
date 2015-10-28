OperationHelper = apac.OperationHelper;

function updateResultsCallback(jsResults, rawXmlResults) {
    console.log('Inside callback, updating DB...');

    // use map function
    var results = {};
    _.each(jsResults.ItemLookupResponse, function (value, key, obj) {
        console.log('Adding key: ' + key);
        if (key === '$') {
            results['metaTag'] = value;
        } else {
            var strResponse = JSON.stringify(jsResults.ItemLookupResponse['Items']);
            if (Array.isArray(jsResults.ItemLookupResponse['Items'])) {
                console.log('Response Items length: ' + jsResults.ItemLookupResponse['Items'].length);
            }
            strResponse = strResponse.replace(/"\$"/g, "\"metaTag\"");
            results[key] = JSON.parse(strResponse);
        }
    });
    //resultsDb.insert(results, function callback(err, id) {
    //    if (err) {
    //        console.log('Fail on ResultItems \'insert\' - ' + err);
    //    } else {
    //        console.log('Success on ResultItems \'insert\'! ' + id);
    //    }
    //});
    // TODO if the results are returned correctly... why store them?
    // could be an enhancement to add 'previous searches' but is otherwise a hassle to maintain.
    return results;
}

Meteor.methods({
    searchByItemId: function (itemIds) {
        if (!itemIds || !itemIds.length) {
            return;
        }
        console.log('Building request for IDs: ' + itemIds);
        var opHelper = new OperationHelper({
            awsId: 'AKIAIL2NSO2QLXXSQW2Q',              // FIXME AWS ID
            awsSecret: '5hmMK87TWCTaK/ipQwmwyvlpP6C9ScFMK5rSYPDM',          // FIXME Secret Key
            assocId: '9470-2365-1575'             // FIXME Associate Tag, e.g. 1234-6789-1011
        });

        var lookupParams = {
            'Condition': 'New',  // Used/New
            'IdType': 'UPC',
            'IncludeReviewsSummary': true,
            'ItemId': itemIds,
            //'MerchantId': 'Amazon', //Only items sold by Amazon
            'SearchIndex': 'All',
            'ResponseGroup': 'ItemAttributes,OfferSummary'
        };

        var response = function(err, jsResults, rawXmlResults) {
            console.log('Ophelper results: ' + !!jsResults);
            console.log('Ophelper XML: ' + !!rawXmlResults);
            if (!err) {
                console.log('Ophelper success!');

                var results = {};
                _.each(jsResults.ItemLookupResponse, function (value, key, obj) {
                    console.log('Adding key: ' + key);
                    if (key === '$') {
                        results['metaTag'] = value;
                    } else {
                        var strResponse = JSON.stringify(jsResults.ItemLookupResponse['Items']);
                        if (Array.isArray(jsResults.ItemLookupResponse['Items'])) {
                            console.log('Response Items length: ' + jsResults.ItemLookupResponse['Items'].length);
                        }
                        strResponse = strResponse.replace(/"\$"/g, "\"metaTag\"");
                        results[key] = JSON.parse(strResponse);
                    }
                });

                return results;//updateResultsCallback(jsResults, rawXmlResults);
            }
            return err;
        };

        var doAsyncExecution = Meteor.wrapAsync(opHelper.execute);
        var searchResults = doAsyncExecution('ItemLookup', lookupParams, response);
        return searchResults;
    },
    clearResults: function () {
        //ResultItems.remove({});
    }
});

function doSearchByItemId(resultDb, itemIds) {//, callback) {
    if (!itemIds || !itemIds.length) {
        return;
    }
    console.log('Building request for IDs: ' + itemIds);
    /*
     Scratchpad link:
     http://webservices.amazon.com/scratchpad/index.html

     Get credentials info:
     https://affiliate-program.amazon.com/gp/advertising/api/detail/your-account.html
     */
    var opHelper = new OperationHelper({
        awsId: 'AKIAIL2NSO2QLXXSQW2Q',              // FIXME AWS ID
        awsSecret: '5hmMK87TWCTaK/ipQwmwyvlpP6C9ScFMK5rSYPDM',          // FIXME Secret Key
        assocId: '9470-2365-1575'             // FIXME Associate Tag, e.g. 1234-6789-1011
    });

    var lookupParams = {
        'Condition': 'New',  // Used/New
        'IdType': 'UPC',
        'IncludeReviewsSummary': true,
        'ItemId': itemIds,
        //'MerchantId': 'Amazon', //Only items sold by Amazon
        'SearchIndex': 'All',
        'ResponseGroup': 'ItemAttributes,OfferSummary'
    };
    var response = function (err, jsResults, rawXmlResults) {
        console.log('Ophelper results: ' + !!jsResults);
        console.log('Ophelper XML: ' + !!rawXmlResults);
        if (!err) {
            console.log('Ophelper success!');
            return updateResultsCallback(resultDb, jsResults, rawXmlResults);
        }
        return err;
    };

    // Total results already included
    opHelper.execute('ItemLookup', lookupParams, response);
}
