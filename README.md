### easy-websocket for node

#### install
```
npm install easy-websocket
```
#### use
```
var websocket = require('easy-websocket');
```

#### example 
##### server


`http`

```
var http      = require('http');
var fs        = require('fs');
var websocket = require('../index');
var app = http.createServer(function (req,res) {
  fs.readFile('./index.html',function (err,data) {
    res.end(data)
  })
});
var ws = WebSocket(app)
          .on('data',function (obj) {
            console.log(obj.type,obj.buffer.length);
          })
          .on('pong',function (text) {
            console.log('pong ...',text);
          });
/*
var ws = WebSocket(app);
ws.on('data',(obj) => {
  console.log(obj.type,obj.buffer.length);
  ws.send('hello world');
});
*/
```

`http`   [path]/example/http-example.js

```
var http      = require('http');
var fs        = require('fs');
var websocket = require('../index');
var app = http.createServer(function (req,res) {
  fs.readFile('./index.html',function (err,data) {
    res.end(data)
  })
});

// websocket
app.on('upgrade',function (req,socket,head) {
  var ws = websocket(socket)
    .shakeHand(req)
    .receiveFrame()
    .on('data',function(obj){
      switch(obj.type) {
        case 'string':
          ws.send(obj.buffer.toString());
        break;
        case 'binary':
          ws.send(obj.buffer,'binary');
        break;
      }
    })
    .on('close',function(text){
      console.log('close socket...',text);
    })
    .on('error',function(text){
      console.log('error',text);
    })
    .on('pong',function(text){
      console.log('pong ...',text);
    })
    .on('ping',function(text){
      console.log('ping ...',text);
    });
})

app.listen(3000);

```

`connect`  [path]/example/connect-example.js

```
var app       = require('connect')();
var http      = require('http');
var fs        = require('fs');
var websocket = require('../index');

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

/*
server.on('upgrade',function (req,socket,head) {
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
      //
    });
})
*/

server.listen(3000);

```

```
 var websocket = require('easy-websocket');
 var ws = websocket(socket);
 ws.shakeHand(req);
 ws.receiveFrame();
 ws.on('data',function(obj){
 	//...
 });
```


## api

#### 1, websocket
##### 1.1 new websocket(server[,config]);
server: instance of http.Server;

```
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

```
var websocket = require('easy-websocket');
server.on('upgrade',function (req,socket,head) {
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
      //
    });
})
```
#### 2, shakeHand(req);
req: http request from client to server;

#### 3, receiveFrame();
receive Frame from client;

#### 4, startPing();
create a ping frame from server to client. In default , this function will call ping([data]) every 10s to ensure this socket connection is alive;

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





















