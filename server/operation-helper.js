OperationHelper = apac.OperationHelper;

function transformResults(jsResults) {
    console.log('Inside callback...');

    var results = {};
    _.each(jsResults.ItemLookupResponse, function (value, key, obj) {
        if (key === '$') {
            // '$' key not allowed
            results['metaTag'] = value;
        } else {
            var strResponse = JSON.stringify(jsResults.ItemLookupResponse['Items']);
            if (Array.isArray(jsResults.ItemLookupResponse['Items'])) {
                console.log('Response Items length:', jsResults.ItemLookupResponse['Items'].length);
            }
            strResponse = strResponse.replace(/"\$"/g, "\"metaTag\""); // '$' key not allowed, nested children
            results[key] = JSON.parse(strResponse);
        }
    });
    return results;
}

Meteor.methods({
    searchByItemId: function (itemIds, accountInfo) {
        try {
            var rawResult = doUpcSearch(itemIds, accountInfo);
            console.log('Items search completed successfully');
            return transformResults(rawResult);
        } catch(e) {
            // Will happen if no params for aws account
            console.log('Items search error!', e);
        }
    }
});

function doUpcSearch(itemIds, accountInfo) {
    /*
     Scratchpad link:
     http://webservices.amazon.com/scratchpad/index.html

     Get credentials info:
     https://affiliate-program.amazon.com/gp/advertising/api/detail/your-account.html
     */
    var opHelper = new OperationHelper({
        awsId: accountInfo.id,
        awsSecret: accountInfo.secretKey,
        assocId: accountInfo.associateTag
    });

    var searchParams = {
        'Condition': 'New',  // Used/New
        'IdType': 'UPC',
        'IncludeReviewsSummary': true,
        'ItemId': itemIds,
        //'MerchantId': 'Amazon', //Only items sold by Amazon
        'SearchIndex': 'All',
        'ResponseGroup': 'ItemAttributes,OfferSummary'
    };

    var wrappedSearch = Meteor.wrapAsync(opHelper.execute, opHelper);
    return wrappedSearch('ItemLookup', searchParams);
}
