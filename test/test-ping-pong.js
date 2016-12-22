import test from 'ava';
import WebSocket from '..';
import http from 'http';
import net from 'net';

var server = null;
var port = null;

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

var getPayload = (data) => {
  var firstByte  = data[0];
  var secondByte = data[1]
  var opcode     = firstByte & 0x0f;
  var hasMask    = secondByte >> 7
  var start      = hasMask ? 6:2
  var payLoadLen = secondByte & 0x7f
  var mask       = [];

  var payload = data.slice(start, start + payLoadLen)
  if (hasMask) {
    mask = data.slice(start - 4, start);
    var payloadDataLen = payload.length
    for (i = 0; i < payloadDataLen; i++) {
      payload[i] ^= mask[i % 4]
    }
  }
  return { opcode,payload }
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

test.serial.cb('Server ping Client Pong', (t) => {
  t.plan(2)
  var ws = WebSocket(server,{
    pingInterval:1000
  })

  ws.on('connect',(websocket) => {
    websocket.on('pong',(data) => {
      if (data.length ===  1 && data[0] === 0x49 ^ 0xed) {
        t.pass()
      } else {
        t.fail()
      }
      t.end()
      websocket.end()
    })
  })
  

  var flag = false
  var client = net.connect({ port:port })
  shakeHand(client,port)
  client.on('data',function(data) {
    if (!flag) {
      flag = true
      return 
    }
    var { opcode,payload } = getPayload(data)
    if (opcode === 0x09 && payload.toString() == '') {
      t.pass()
    } else {
      t.fail()
    }
    var pong = new Buffer([0x8a,0x81,0xed,0x20,0x44,0xc9,0x49])
    client.write(pong)  
  })
})

test.serial.cb('Client ping Server pong', (t) => {
  t.plan(2)
  var len = Math.round(Math.random() * 100 + 0.5)
  var tmp = new Buffer(len)
  var pong = false
  var ws = WebSocket(server,{
    pingInterval:1000,
    enablePing:false // close sever ping
  })
  var wss;
  ws.on('connect',(websocket) => {
    wss = websocket
    websocket.on('ping',(data) => {
      if (data.length === tmp.length) {
        t.pass()
      } else {
        t.fail()
      }
    })
  })

  var client = net.connect({ port:port })
  shakeHand(client,port)
  client.on('data',function(data) {
    if (pong) {
      if (data[0] === 0x8a) {
        t.pass()
      } else {
        t.fail()
      }
      t.end()
      wss.end()
      return 
    }
    pong = true
    var ping = new Buffer([0x89,0x80+len,0xc3,0x20,0x44,0xc9])
    ping = Buffer.concat([ping,tmp],ping.length+len)
    client.write(ping)
  })
})

test.serial.cb('Client ping disable Server pong', (t) => {
  t.plan(2)
  var len = Math.round(Math.random() * 100 + 0.5)
  var tmp = new Buffer(len)
  var ws = WebSocket(server,{
    pingInterval:500,
    enablePong: false,
    enablePing:false
  })
  var wss;
  ws.on('connect',(websocket) => {
    wss = websocket
    
    websocket.on('ping',(data) => {
      if (data.length === tmp.length) {
        t.pass()
      } else {
        t.fail()
      }
    })
  })
  

  var pong = false
  var client = net.connect({ port:port })
  shakeHand(client,port)
  client.on('data',function(data) {
    if (pong) {
      if (data[0] == 0x8a) {
        t.fail()
      } else {
        t.pass()
      }
      clearTimeout(timer)
      t.end()
      wss.end()
      return
    }
    pong = true;
    var ping = new Buffer([0x89,0x80+len,0xc3,0x20,0x44,0xc9])
    ping = Buffer.concat([ping,tmp],ping.length+len)
    client.write(ping)
    var timer = setTimeout(() => {
      t.pass()
      t.end()
      wss.end()
    },2000)
  })
})