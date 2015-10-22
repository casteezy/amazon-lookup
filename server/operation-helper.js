OperationHelper = apac.OperationHelper;

/*

 */
var updateResultsCallback = function (resultsDb, jsResults, rawXmlResults) {
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
};

Meteor.methods({
    searchByItemId: function (itemIds) {
        var doAsyncSearch = Meteor.wrapAsync(doSearchByItemId);
        var searchResults = doAsyncSearch(ResultItems, itemIds, updateResultsCallback);
        return searchResults;
    },
    saveSearch: function(id, searchData) {
        SavedSearches.insert({ id: id, searchData: searchData }, function callback(err, id) {
            if (err) {
                console.log('Fail on SavedSearches \'insert\' - ' + err);
            } else {
                console.log('Success on SavedSearches \'insert\'! ' + id);
            }
        });
    }
});

function doSearchByItemId(resultDb, itemIds, callback) {
    resultDb.remove({}); // TODO: clear? is this necessary?
    if (!itemIds || !itemIds.length) {
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
