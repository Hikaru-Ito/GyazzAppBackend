var express = require('express');
var mongoose = require('mongoose');
var crypto = require('crypto');
var bodyParser = require('body-parser');
var _ = require('lodash');

var app = express();

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended: true}));

var Schema = mongoose.Schema;
var uri = process.env.MONGOLAB_URI || 'mongodb://localhost/mongo_data';
console.log('USE_DB_SOURSE:'+uri);


// モデルスキーマ
var UserSchema = new Schema({
  name:  String,
  session_key: String,
  platform: String,
  device_token: String,
  created: {
    type: Date,
    default: Date.now
  }
});
mongoose.model('User', UserSchema);

var StarSchema = new Schema({
  user_id:  String,
  page_name: String,
  created: {
    type: Date,
    default: Date.now
  }
});
mongoose.model('Star', StarSchema);

mongoose.connect(uri);

var User = mongoose.model('User');
var Star = mongoose.model('Star');


// 仮データ登録
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

app.all('/*', function(request, response, next){
    response.contentType('json');
    response.header('Access-Control-Allow-Origin', '*');
    next();
});


app.get('/', function(request, response) {
  response.send('GyazzApp::API')
});

app.get('/users', function(req, res) {
	User.find({}, function(err, docs) {
    res.send(docs);
	});
});
app.get('/users/:session_key', function(req, res) {
  User.find({name:req.params.session_key}, function(err, docs) {
    res.send(docs);
  });
});


// 新規ユーザー登録
app.post('/users', function(req, res) {
  var now_date = new Date();
  var name = req.body.name;
  var platform = req.body.platform;
  var device_token = req.body.device_token;
  var sha512 = crypto.createHash('sha512');
      sha512.update(now_date.getTime()+name);
  var session_key = sha512.digest('hex');
  var user = new User();
      user.name = name;
      user.session_key = session_key;
      user.platform = platform;
      user.device_token = device_token;

  User.create(user, function(err, user) {
    if(err) { return handleError(res, err); }
    res.send(user);
  });
});


// 名前変更
app.post('/users/change_name', function(req, res) {
  if(!req.body.session_key) { return res.sendStatus(500) }
  User.update({ session_key: req.body.session_key }, { name: req.body.name },{ upsert: false, multi: true }, function(err, docs) {
    if(docs.n == 0) { // ユーザーがいない場合は404
      return res.sendStatus(404);
    }
    res.send(docs);
  });
});

// デバイストークン保存
app.post('/users/add_devicetoken', function(req, res) {
  if(!req.body.session_key) { return res.sendStatus(500) }
  User.update({ session_key: req.body.session_key }, { device_token: req.body.device_token },{ upsert: false, multi: true }, function(err, docs) {
    if(docs.n == 0) { // ユーザーがいない場合は404
      return res.sendStatus(404);
    }
    res.send(docs);
  });
})

// スター保存
app.post('/stars/add', function(req, res) {
  if(!req.body.session_key) { return res.sendStatus(500) }
  User.findOne({ session_key: req.body.session_key }, function(err, key) {
    if(key == null){
      return res.sendStatus(404);
    }
    // すでにあるか確認
    Star.findOne({ user_id: key._id, page_name: req.body.page_name }, function(err, docs) {
      if(docs !== null) {
        return res.sendStatus(200);
      }
      Star.create({ user_id: key._id, page_name: req.body.page_name }, function(err, docs) {
        res.send(docs);
      });
    });
  });
});

// スター削除
app.post('/stars/remove', function(req, res) {
  if(!req.body.session_key) { return res.sendStatus(500) }
  User.findOne({ session_key: req.body.session_key }, function(err, key) {
    if(key == null){
      return res.sendStatus(404);
    }
    Star.remove({ user_id: key._id, page_name:req.body.page_name}, function(err, docs) {
      if(docs.n == 0) {
        return res.sendStatus(403);
      }
      res.send(docs);
    });
  });
});

// Gyazz更新通知を受信
app.post('/gyazz-webhook', function(req, res) {
  var url = req.body.url;
  var wiki = req.body.wiki;
  var title = req.body.title;
  var text = req.body.text;
  res.send(url+wiki+title+text);
});


function handleError(res, err) {
  return res.send(500, err);
}


app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
});
// Expose app
exports = module.exports = app;