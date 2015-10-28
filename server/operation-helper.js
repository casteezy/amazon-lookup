OperationHelper = apac.OperationHelper;

function updateResultsCallback(resultsDb, jsResults, rawXmlResults) {
    console.log('Inside callback, updating DB...');

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
    resultsDb.insert(results, function callback(err, id) {
        if (err) {
            console.log('Fail on ResultItems \'insert\' - ' + err);
        } else {
            console.log('Success on ResultItems \'insert\'! ' + id);
        }
    });
    // TODO if the results are returned correctly... why store them?
    // could be an enhancement to add 'previous searches' but is otherwise a hassle to maintain.
    return results;
}

Meteor.methods({
    searchByItemId: function (itemIds) {
        var doAsyncSearch = Meteor.wrapAsync(doSearchByItemId);
        var searchResults = doAsyncSearch(ResultItems, itemIds, updateResultsCallback);
        return searchResults;
    },
    clearResults: function () {
        ResultItems.remove({});
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
        awsId: '',              // FIXME AWS ID
        awsSecret: '',          // FIXME Secret Key
        assocId: ''             // FIXME Associate Tag, e.g. 1234-6789-1011
    });

    // Total results already included
    opHelper.execute('ItemLookup', {
        'Condition': 'New',  // Used/New
        'IdType': 'UPC',
        'IncludeReviewsSummary': true,
        'ItemId': itemIds,
        //'MerchantId': 'Amazon', //Only items sold by Amazon
        'SearchIndex': 'All',
        'ResponseGroup': 'ItemAttributes,OfferSummary'
    }, function response(err, jsResults, rawXmlResults) {
        console.log('Ophelper results: ' + !!jsResults);
        console.log('Ophelper XML: ' + !!rawXmlResults);
        if (!err) {
            console.log('Ophelper success!');
            return updateResultsCallback(resultDb, jsResults, rawXmlResults);
        }
        return err;
    });
}
