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

* `http` [path]/example/http-example.js

```javascript
var http      = require('http');
var fs        = require('fs');
var websocket = require('easy-websocket');

var server = http.createServer(function (req,res) {
  fs.readFile('./index.html',function (err,data) {
    res.end(data)
  })
});

websocket(server)
  .on('connect',(ws) => {
    ws.on('data',(obj) => {
      console.log(obj.type);
      ws.send("hello world");
    })
  })

server.listen(3000);
```

* `express`  [path]/example/express-example.js
* only require websocket protocol

```javascript
var app       = require('express')();
var http      = require('http');
var fs        = require('fs');

// only websocket protocal
var websocketlib = require('easy-websocket/websocket');

app.use(function (req,res,next) {
  fs.readFile('./index.html',function (err,data) {
    res.end(data);
  })
});

var server = http.Server(app);

// websocket
server.on('upgrade',function (req,socket,head) {
  var ws = websocketlib(socket)
    .shakeHand(req)
    .receiveFrame()
    .on('data',(obj) => {
      console.log(obj.type,obj.buffer.length);
      switch(obj.type) {
        case 'string':
          ws.send(obj.buffer.toString());
        break;
        case 'binary':
          ws.send(obj.buffer,'binary');
        break;
      }
    })
})

server.listen(3000);
```
## Check auth 


When the client tries to connect to the websocket server, the easy-websocket checks auth before the server responds with handshake data, and then decides whether  responds with handshake data.

By default,

* if defaultAuth(req) returns a false,  server responds with shakehand data.
* if defaultAuth(req) returns a non-false value,  server will end the socket with the value, and reject the shakehand request.

```javascript
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

```javascript
var app       = require('connect')();
var http      = require('http');
var fs        = require('fs');
var server    = http.Server(app);
var websocket = require('easy-websocket');
var wsServer  = websocket(server);
app.use(function (req,res,next) {
  fs.readFile('./index.html',function (err,data) {
    res.end(data);
  })
});

// check auth
wsServer.auth = function (req) {
  return checkCookie(req);
}

function checkCookie(req) {
  // return '403 forbidden';
  return false;
}

wsServer.on('connect',(ws) => {
  ws.on('data',(obj) => {
    console.log(obj.type,obj.buffer.length);
    ws.send('hello world');
  });
})



var server = http.Server(app).listen(3000);
```


## api

### 1 websocket.js: protocol

```
var websocketlib = require('easy-websocket/websocket');
```

#### 1.1  websocketlib(socket[,config]);

socket: instance of net.Socket;

```javascript
var websocketlib = require('easy-websocket/websocket');
server.on('upgrade',function (req,socket,head) {

  // check req auth
  // ...
  
  var ws = websocketlib(socket)
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
config: optional , json object;
defalut config:

```javascript
{
  pingInterval:10000,
  enablePing:true,
  enablePong:true
}
```
#### 1.2, defaultAuth(req)

default check auth method;

#### 1.3, auth(req)

an interface to user, if auth is set, check auth via auth(req);

#### 1.4, shakeHand(req);

req: http request from client;

#### 1.5, receiveFrame();
receive Frame from client;

#### 1.6, startPing();
create a ping frame from server to client. By default , this function will call ping([data]) every 10s to ensure this socket connection is alive;

if config.enablePing is true and you never call clearPing() ,it means you should not call this function;

#### 1.7, clearPing();
stop ping ;

#### 1.8, ping([data]);
only create ping frame one time;
data: optinal, it can be a string or buffers

#### 1.9, pong([data]);
respone for ping which come from client;

#### 1.10, send(data[,opcode]);
data : a string or buffers
opcode : optinal, the default value is 'text'. if data are buffers , this value must set 'binary'

#### 1.11, end();
close socket;

#### event 
* 'connect' emit when shakehand success
* 'data' : emit when receive data from client
* 'error' : emit when some error occur
* 'ping' : emit when server accept ping frame
* 'pong' : emit when server accept pong frame
* 'close' : emit when close socket




### index.js: websocket server

```javascript
var websocket = require('easy-websocket');
...
var wsServer  = websocket(server,{...});
wsServer.on('connect',(ws) => {
  ws.on('data',(obj) => {
    console.log(obj.type,obj.buffer.length);
    ws.send('hello world');
  });
})
```



#### 2.1, websocket(server[,config]);

server instance of http.Server;

config refer to 1.1



#### 2.2, auth(req);

An interface to user, wesocketlib.auth will reference to this auth, if we set this auth, when calls auth(req) in wesocketlib,  it actually calls this auth. 

```javascript
// check auth
wsServer.auth = function (req) {
  return checkCookie(req);
}
```



#### event

* connect: emit when shakehand success. The only input param of callback `ws`is an instance of  websocketlib

  ```javascript
  wsServer.on('connect',(ws) => {
    ws.on('data',(obj) => {
      console.log(obj.type,obj.buffer.length);
      ws.send('hello world');
    });
  })
  ```

  ​
















