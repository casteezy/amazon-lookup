OperationHelper = apac.OperationHelper;

var updateResultsCallback = function (resultsDb, jsResults, rawXmlResults) {
    console.log('Inside callback, updating DB...');

    var results = {};
    _.each(jsResults.ItemLookupResponse, function (value, key, obj) {
        console.log('Adding key: ' + key);
        if (key === '$') {
            results['metaTag'] = value;
        } else {
            var strResponse = JSON.stringify(jsResults.ItemLookupResponse['Items']);
            strResponse = strResponse.replace(/"\$"/g, "\"metaTag\"");
            results[key] = JSON.parse(strResponse);
        }
    });
    resultsDb.insert(results, function callback(err, id) {
        if (err) {
            console.log('Fail on \'insert\' - ' + err);
        } else {
            console.log('Success on \'insert\'! ' + id);
        }
    });
};

Meteor.methods({
    searchByItemId: function (itemId) {
        var doAsyncSearch = Meteor.wrapAsync(doSearchByItemId);
        var searchResults = doAsyncSearch(ResultItems, itemId, updateResultsCallback);
        return searchResults;
    }
});

function doSearchByItemId(resultDb, itemIds, callback) {
    if (!itemIds) {
        return;
    }
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
    }, function (err, jsResults, rawXmlResults) {
        console.log('Ophelper results: ' + !!jsResults);
        console.log('Ophelper XML: ' + !!rawXmlResults);
        if (!err) {
            console.log('Ophelper success!');
            callback && callback(resultDb, jsResults, rawXmlResults);
        }
    });
}
