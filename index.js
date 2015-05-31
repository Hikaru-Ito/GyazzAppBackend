var express = require('express');
var mongoose = require('mongoose');
var crypto = require("crypto");

var app = express();

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

var Schema = mongoose.Schema;
var uri = process.env.MONGOLAB_URL || 'mongodb://localhost/mongo_data';
// console.log('USE_DB_SOURSE:'+uri);


// var sha512 = crypto.createHash('sha512');

// var UserSchema = new Schema({
//   name:  String,
//   session_key: String,
//   platform: String,
//   device_token: String,
//   created: {
//     type: Date,
//     default: Date.now
//   }
// });
// mongoose.model('User', UserSchema);

// mongoose.connect(uri);

// var User = mongoose.model('User');

// // 仮データ登録
// var now_date = new Date();
// var name = 'Hikaru';
// var session_key = sha512.update(now_date.getTime()+name).digest('hex')

// var user = new User();
// user.name  = name;
// user.session_key = session_key;
// user.platform = 'ios';
// user.device_token = '9876567890987';
// user.date = now_date;
// user.save(function(err) {
//   if (err) { console.log(err); }
// });

// app.all('/*', function(request, response, next){
//     response.contentType('json');
//     response.header('Access-Control-Allow-Origin', '*');
//     next();
// });


app.get('/', function(request, response) {
  response.send('GyazzApp::API')
});

// app.get('/users', function(req, res) {
// 	User.find({}, function(err, docs) {
//     res.send({data:docs});
// 	});
// });


app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
});
