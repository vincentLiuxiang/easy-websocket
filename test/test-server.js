import test from 'ava';
import WebSocket from '..';
import WebSocketlib from '../websocket';
import http from 'http';
import net from 'net';

var server = null;
var port = 8001;

// hello world
var strBuf = new Buffer([0x81,0x8b,0xac,0xd7,0x32,0x47,0xc4,
0xb2,0x5e,0x2b,0xc3,0xf7,0x45,0x28,0xde,0xbb,0x56]);
var closeBuf = new Buffer([0x88,0x82,0xc3,0x20,0x44,0xc9,0xc0,0xc8])
var binBuf = new Buffer([0x82,0x80,0x4d,0x15,0xc8,0x6e])

var shakeHand = (client,port,cb) => {
  client.write(
    'GET ws://localhost:' + port + '/ws HTTP/1.1\n' +
    'Origin: http://localhost:' + port + '\n' +
    'Host: localhost:' + port + '\n' +
    'Sec-WebSocket-Key: a-test-key==\n' +
    'Upgrade: websocket\n' +
    'Connection: Upgrade\n' +
    'Sec-WebSocket-Version: 13\n\r\n\r\n',cb
  )
}

test.beforeEach.cb("Start a easy-websocket Server", (t) => {
  server = new http.Server();
  server.listen(() => {
    port = server.address().port
    t.end()
  })
})

test.afterEach.cb((t) => {
  server.close(() => {
    t.end()
  });
})



test.serial.cb('Server req header sec-websocket-key', (t) => {
  var ws = WebSocket(server);
  var client = net.connect({ port:port })

  client.write(
    'GET ws://localhost:' + port + '/ws HTTP/1.1\n' +
    'Origin: http://localhost:' + port + '\n' +
    'Host: localhost:' + port + '\n' +
    // 'Sec-WebSocket-Key: a-test-key==\n' +
    'Upgrade: websocket\n' +
    'Connection: Upgrade\n' +
    'Sec-WebSocket-Version: 13\n\r\n\r\n'
  )

  client.on('data',(msg) => {
    if (msg.toString() == 'sec-websocket-key header is not exist') {
      t.pass()
    } else {
      t.fail()
    }
    t.end()
  })

})

test.serial.cb('Server req header sec-websocket-protocol', (t) => {
  var ws = WebSocket(server);
  var client = net.connect({ port:port })

  client.write(
    'GET ws://localhost:' + port + '/ws HTTP/1.1\n' +
    'Origin: http://localhost:' + port + '\n' +
    'Host: localhost:' + port + '\n' +
    'Sec-WebSocket-Key: a-test-key==\n' +
    'Upgrade: websocket\n' +
    'Connection: Upgrade\n' +
    'sec-websocket-protocol:/hello\n' +
    'Sec-WebSocket-Version: 13\n\r\n\r\n'
  )

  client.once('data',(data) => {
    var index = data.toString().split("\r\n").findIndex((str) => {
      var kv = str.split(":");
      return kv[0] === 'Sec-Websocket-Protocol' && kv[1] === '/hello';
    });
    if (index != -1) {
      t.pass();
    } else {
      t.fail();
    }
    t.end();
    // ws.end();
    client.end(closeBuf)
  })

})

test.serial.cb('Server req header Sec-WebSocket-Accept', (t) => {
  var ws = WebSocket(server);
  var wss
  ws.on('connect',(s) => {
    wss = s
  })
  var client = net.connect({ port:port })

  client.write(
    'GET ws://localhost:' + port + '/ws HTTP/1.1\n' +
    'Origin: http://localhost:' + port + '\n' +
    'Host: localhost:' + port + '\n' +
    'Sec-WebSocket-Key: a-test-key==\n' +
    'Upgrade: websocket\n' +
    'Connection: Upgrade\n' +
    'sec-websocket-protocol:/hello\n' +
    'Sec-WebSocket-Version: 13\n\r\n\r\n'
  )

  client.once('data',(data) => {
    var index = data.toString().split("\r\n").findIndex((str) => {
      var kv = str.split(":");
      return kv[0] === 'Sec-WebSocket-Accept' && kv[1] === 'psHnarcstaisDl2ioli4UL0Gq8w=';
    });
    if (index != -1) {
      t.pass();
    } else {
      t.fail();
    }
    t.end();
    wss.end();
  })

})

test.serial.cb('Server recv string', (t) => {
  var ws = WebSocket(server);
  var wss
  ws.on('connect',(s) => {
    wss = s
    s.once('data',(obj) => {
      wss.end()
      if (obj.buffer.toString() === 'hello world') {
        t.pass()
      } else {
        t.fail()
      }
      t.end()
    });
  })

  var client = net.connect({ port:port })

  shakeHand(client,port)

  client.once('data',function(data) {
    client.write(strBuf)
  })
})

test.serial.cb('Server recv binary', (t) => {
  var ws = WebSocket(server);
  ws.on('connect',(s) => {
    s.once('data',(obj) => {
      s.end()
      if (obj.type === 'binary') {
        t.pass()
      } else {
        t.fail()
      }
      t.end()
    });
  })

  var client = net.connect({ port:port })

  shakeHand(client,port)

  client.once('data',function(data) {
    client.write(binBuf)
  })
})

test.serial.cb('Server onUpgrade socket', (t) => {
  var ws = null;
  server.on('upgrade',function (req,socket,head) {
    ws = WebSocketlib(socket)
    if (ws.socket instanceof net.Socket) {
      t.pass()
    } else {
      t.fail()
    }
    t.end()
    ws.end()
  })
  var client = net.connect({ port:port })
  shakeHand(client,port)
})

test.serial.cb('Server onUpgrade server', (t) => {
  var ws = WebSocket(server)
  var wss;
  ws.on("connect",(websocket) => {
    wss = websocket
  })

  if (ws.server instanceof http.Server) {
    t.pass()
  } else {
    t.fail()
  }

  server.on('upgrade',() => {
    if (wss.socket instanceof net.Socket) {
      t.pass()
    } else {
      t.fail()
    }
    t.end()
    wss.end()
  })

  var client = net.connect({ port:port })
  shakeHand(client,port)
})

test.serial.cb('Server shakeHand', (t) => {
  var ws = null;
  server.on('upgrade',function (req,socket,head) {
    ws = WebSocketlib(socket).shakeHand(req)
  })
  var client = net.connect({ port:port })
  shakeHand(client,port)
  client.once('data',function(data) {
    if (data.toString() == 'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: WebSocket\r\n' +
        'Connection: Upgrade\r\n' +
        'Sec-WebSocket-Accept:psHnarcstaisDl2ioli4UL0Gq8w=\r\n\r\n') {
      t.pass()
    } else {
      t.fail()
    }
    t.end()
    ws.end()
  })
})

test.serial.cb('Server receiveFrame', (t) => {
  var ws = null;
  server.on('upgrade',function (req,socket,head) {
    ws = WebSocketlib(socket)
      .shakeHand(req)
      .receiveFrame()
      .on('data',(obj) => {
        ws.end()
        if (obj.buffer.toString() === 'hello world') {
          t.pass()
        } else {
          t.fail()
        }
        t.end()
      })
  })
  var client = net.connect({ port:port })
  shakeHand(client,port)
  client.once('data',function(data) {
    client.write(strBuf)
  })
})

