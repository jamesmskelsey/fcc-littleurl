var express = require('express');
var app = express();
var mongo = require('mongodb').MongoClient;
// creating a new objectId is required to search for things by objectid in mongo -_-
var oID = require('mongodb').ObjectID;
// mongo database url
var murl = process.env.MONGODB_URI || 'mongodb://localhost:27017/littleurl';

app.set('view engine', 'pug');

app.set('port', (process.env.PORT || 5000));

mongo.connect(murl, function(err, db) {
    console.log("Successfully connected to a mongo db server.");
    db.close();
})

/*
    db is the database we want to connect to... 
*/
var createSmallURL = function(db, url, callback) {
    var document = {
        originalurl: url
    };
    var collection = db.collection('littleurls');
    collection.insertOne(document, function(err, result) {
        callback(result);
    }); 
}

var findSmallURL = function(db, littleurl, callback) {
  var collection = db.collection('littleurls');
  // GAH! Mongo is so frustrating after using ANY database in Rails.
  collection.find({"_id": new oID(littleurl)}).toArray(function(err, doc) {
      console.log(doc);
     callback(doc[0]); 
  });
};

app.get('/', function(req, res) {
    console.log("received request for index");
    console.log(req.protocol + "://" + req.get('host') + req.originalUrl);
    res.render('index');
});


// This is... not so good. I read up on 'encodeURIComponent' but even using an 
// app.all('') and then trying to modify the incoming url... i just get nothing. So...
// that confuses me. So I go this route. Just whatever comes in, is it a legit url? Okay.
app.get('/littleurl/*', function(req, res) {
    console.log('creating a littleurl');
    // Not a comprehensive URL searcher, but it gets the job done for this task
    // I could use one that I found on the net, but then I wouldn't know 100% what it does.
    var regex = /^https?:\/\/[a-z1-9]+\.[a-z1-9]+\.[a-z1-9]+$/;
    var url = req.params['0'];
    // this makes this work in test/production
    var myUrl = req.protocol + "://" + req.get('host');
    console.log(url);
    if (url.match(regex).length) {
        // Next up, add the URL to the database, get back a document, and then use that 
        // as part of the url
        mongo.connect(murl, function(err, db) {
           createSmallURL(db, url, function(result) {
               // extract the id from the url, because that's just the easiest way
               var shortURL = result.ops[0]._id;
               db.close();
               res.send(JSON.stringify({ littleurl: myUrl + "/" + shortURL, originalurl: url} ))
           }); 
        });
    }
});

app.get('/:littleurl', function(req, res) {
    console.log("called a littleurl: " + req.params.littleurl);
   // grab the document from the database, and then redirect to the resulting url
   mongo.connect(murl, function(err,db) {
       findSmallURL(db, req.params.littleurl, function(result) {
           res.redirect(result.originalurl);
       });
       db.close();
   })
});

app.listen(app.get('port'), function() {
    console.log('Listening on : ', app.get('port'));
})