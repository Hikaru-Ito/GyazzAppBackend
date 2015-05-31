var express = require('express');
var mongoose = require('mongoose');
var crypto = require('crypto');
var request = require('request');
var bodyParser = require('body-parser');
var _ = require('lodash');

var app = express();


app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
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

var GyazzPageNotificationSchema = new Schema({
  url:  String,
  wiki:  String,
  title: String,
  text: String,
  created: {
    type: Date,
    default: Date.now
  }
});
mongoose.model('GyazzPageNotification', GyazzPageNotificationSchema);

mongoose.connect(uri);

var User = mongoose.model('User');
var Star = mongoose.model('Star');
var GyazzPageNotification = mongoose.model('GyazzPageNotification');



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
  res.send('ok');

  // データベースに登録
  var gyazz = new GyazzPageNotification();
      gyazz.url = url;
      gyazz.wiki = wiki;
      gyazz.title = title;
      gyazz.text = text;
      gyazz.save();

  // スターに登録している人を抽出
  var users = []; // user_idのみ格納
  Star.find({page_name:title}, function(e, r) {
    _.forEach(r, function(n, key) {
      users.push('GyazzUserID'+n.user_id);
    });

    // プッシュ通知
    var message = '「'+title+'」が更新されました。'
    var url = 'https://api.parse.com/1/push';
    var headers = {
        'X-Parse-Application-Id': 'pVATfByzSVGuH1cfC7q9sdfZhOSBBZjoToIRVXli',
        'X-Parse-REST-API-Key' : 'lyQJVyUEVzJCqq2A5HYNRx5ytlSuNtbjlqkwA6R6',
        'Content-Type' : 'application/json'
    };
    users.push('ALLRECIEVE');
    var form = JSON.stringify({
      "channels": users,
      "data":{
        "alert": message,
        "badge" :0,
        "sound":"default",
        "title": "Gyazzが更新されました"
      }
    });

    request.post({ url: url, form: form, headers: headers }, function (e, r, body) {
        res.send('ok');
    });

  });

});
app.get('/gyazzs', function(req, res) {
  GyazzPageNotification.find({}, function(err, docs) {
    // res.send(docs);
  });

  // スターに登録している人を抽出
  var users = []; // user_idのみ格納
  Star.find({page_name:req.query.title}, function(e, r) {
    _.forEach(r, function(n, key) {
      users.push('GyazzUserID'+n.user_id);
    });

    // プッシュ通知
    var message = '「Page」が更新されました。'
    var url = 'https://api.parse.com/1/push';
    var headers = {
        'X-Parse-Application-Id': 'pVATfByzSVGuH1cfC7q9sdfZhOSBBZjoToIRVXli',
        'X-Parse-REST-API-Key' : 'lyQJVyUEVzJCqq2A5HYNRx5ytlSuNtbjlqkwA6R6',
        'Content-Type' : 'application/json'
    };
    users.push('ALLRECIEVE');
    console.log(users);

    var form = JSON.stringify({
      "channels": users,
      "data":{
        "alert": message,
        "badge" :0,
        "sound":"default",
        "title": "Gyazzが更新されました"
      }
    });

    request.post({ url: url, form: form, headers: headers }, function (e, r, body) {
        console.log(body);

        res.send('ok');
    });

  });





});
app.get('/testPush', function(req, res) {


  var url = 'https://api.parse.com/1/push';
  var headers = {
      'X-Parse-Application-Id': 'pVATfByzSVGuH1cfC7q9sdfZhOSBBZjoToIRVXli',
      'X-Parse-REST-API-Key' : 'lyQJVyUEVzJCqq2A5HYNRx5ytlSuNtbjlqkwA6R6',
      'Content-Type' : 'application/json'
  };
  var form = JSON.stringify({
    "channels": [
      "TEST",
      "Mets"
    ],
    "data":{
      "alert": "From GyazzServer",
      "badge" :0,
      "sound":"default"
    }
  });

  request.post({ url: url, form: form, headers: headers }, function (e, r, body) {
      console.log(body);

      res.send('ok');
  });


})



function handleError(res, err) {
  return res.send(500, err);
}


app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
});
// Expose app
exports = module.exports = app;