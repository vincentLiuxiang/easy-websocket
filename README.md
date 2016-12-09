### easy-websocket for node

[![Build Status](https://travis-ci.org/vincentLiuxiang/easy-websocket.svg?branch=master)](https://travis-ci.org/vincentLiuxiang/easy-websocket) [![Coverage Status](https://coveralls.io/repos/github/vincentLiuxiang/easy-websocket/badge.svg)](https://coveralls.io/github/vincentLiuxiang/easy-websocket)

(The MIT License)

## install
```
npm install easy-websocket
```
## use
```javascripts
var websocket = require('easy-websocket');
```

## example 
##### browser client
[index.html](https://github.com/vincentLiuxiang/easy-websocket/blob/master/example/index.html)

```javascripts
  ws = new WebSocket('ws://'+window.location.host+'/Demo');
  
  ws.onopen = function (e) {
    console.log('onopen ...,will send ...');
    ws.send('hello world);
  };

  ws.onclose = function (e) {
    console.log('closed ...');
  };

  ws.onmessage = function (e) {
    console.log('onmessage',e.data);
  };

  ws.onerror   = function (e) {
    console.log(e);
  };
  
  ...

  ws.send(...);
  ws.close(1000);
```

## server

* `http` [path]/example/connect-example.js

```javascripts
var http      = require('http');
var fs        = require('fs');
var websocket = require('..');
var app = http.createServer(function (req,res) {
  fs.readFile('./index.html',function (err,data) {
    res.end(data)
  })
});
var ws = websocket(app)
  .on('data',function (obj) {
    console.log(obj.type,obj.buffer.length);
  })
  .on('pong',function (data) {
    console.log('pong ...',data);
  })
```

* `connect`  [path]/example/connect-example.js

```javascripts
var app       = require('connect')();
var http      = require('http');
var fs        = require('fs');
var websocket = require('..');

// app.use(...)

app.use(function (req,res,next) {
  fs.readFile('./index.html',function (err,data) {
    res.end(data);
  })
});

var server = http.Server(app);
var ws = websocket(server);
ws.on('data',(obj) => {
  console.log(obj.type,obj.buffer.length);
  ws.send('hello world');
});

server.listen(3000);

```
## Check auth 


When the client tries to connect to the websocket server, the easy-websocket checks auth before the server responds with handshake data, and then decides whether  responds with handshake data.

By default,

* if defaultAuth(req) returns a false,  server responds with shakehand data.
* if defaultAuth(req) returns a non-false value,  server will end the socket with the value, and reject the shakehand request.

```javascripts
WebSocket.prototype.defaultAuth = function (req) {
  if (!req.headers.origin) {
    return 'origin header is not exist';
  }

  if (!req.headers.host) {
    return 'host header is not exist';
  }

  var host = urlParse(req.headers.origin).host;

  if (host !== req.headers.host) {
    return 'Origin: ' + req.headers.origin + ' 403 forbidden\n'
  }

  return false
}
```


## Check auth in your way 

easy-websocket provides a custom way to check auth.

* By default, auth is undefined. So easy-websocket checks auth via defaultAuth(req);
* However, if you set auth, easy-websocket checks auth via auth(req);

* when calls this.auth(req), and it returns a false (or can be converted to false), server will respond with shakehand data.
* when calls this.auth(req), and it returns a non-false value. server will end the socket with the value, and reject the shakehand request.

eg.

```javascripts
var app       = require('connect')();
var http      = require('http');
var fs        = require('fs');
var websocket = require('..');
var ws = websocket(server);
app.use(function (req,res,next) {
  fs.readFile('./index.html',function (err,data) {
    res.end(data);
  })
});

// check auth
ws.auth = function (req) {
  return ws.defaultAuth(req) || checkCookie(req);
}

function checkCookie(req) {
  // return '403 forbidden';
  // return false;
}

ws.on('data',(obj) => {
  console.log(obj.type,obj.buffer.length);
  ws.send('hello world');
});

var server = http.Server(app).listen(3000);

```


## api

#### 1, websocket
##### 1.1 new websocket(server[,config]);
server: instance of http.Server;

```javascripts
var websocket = require('easy-websocket');
var server = http.Server();
//var server = http.createServer();
var ws = new websocket(server);
ws.on('data',() => {
})
//...
```
config: optional , json object;
defalut config:

```
{
  pingInterval:10000,
  enablePing:true,
  enablePong:true
}
```
#### 1.2 new websocket(socket[,config]);
* socket.
* config: refer to 1.1.

```javascripts
var websocket = require('easy-websocket');
server.on('upgrade',function (req,socket,head) {

  // check req auth
  // ...
  
  var ws = websocket(socket)
    .shakeHand(req)
    .receiveFrame()
    .on('data',function(obj){
      console.log(obj.type,obj.buffer.length);
      switch(obj.type) {
        case 'string':
          ws.send(obj.buffer.toString());
        break;
        case 'binary':
          ws.send(obj.buffer,'binary');
        break;
      }
    });
})
```
#### 2, shakeHand(req);
req: http request from client;

#### 3, receiveFrame();
receive Frame from client;

#### 4, startPing();
create a ping frame from server to client. By default , this function will call ping([data]) every 10s to ensure this socket connection is alive;

if config.enablePing is true and you never call clearPing() ,it means you should not call this function;

#### 5, clearPing();
stop ping ;

#### 6, ping([data]);
only create ping frame one time;
data: optinal, it can be a string or buffers

#### 6, pong([data]);
respone for ping which come from client;

#### 7, send(data[,opcode]);
data : a string or buffers
opcode : optinal, the default value is 'text'. if data are buffers , this value must set 'binary'

#### 8, end();
close socket;

## event 
* 'data' : when receive data from client
* 'error' : when some error occur
* 'ping' : when server accept ping frame
* 'pong' : when server accept pong frame
* 'close' : when close socket





















