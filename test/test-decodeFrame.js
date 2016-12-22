import test from 'ava';
import WebSocket from '..';
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

test.serial.cb('Server decodeFrame RSV ', (t) => {
  var rsvError = new Buffer([0x30,0x00])
  var ws = WebSocket(server)
  ws.on('connect',(websocket) => {
    websocket.once('error',(error) => {
      if (error.message === 'RSV1/2/3 must be 0') {
        t.pass()
      } else {
        t.fail()
      }
      t.end()
      websocket.end()
    })
  })
  var client = net.connect({ port:port })
  shakeHand(client,port)
  client.once('data',function(data) {
    client.write(rsvError)
  })
})

test.serial.cb('Server decodeFrame control frame FIN ', (t) => {
  var ws = WebSocket(server)
  var finError = new Buffer([0x08,0x82])
  ws.on('connect',(websocket) => {
    websocket.once('error',(error) => {
      if (error.message === 'Control frames must not be fragmented') {
        t.pass()
      } else {
        t.fail()
      }
      t.end()
      websocket.end()
    })
  })

  var client = net.connect({ port:port })
  shakeHand(client,port)
  client.once('data',function(data) {
    client.write(finError)
  })
})

test.serial.cb('Server decodeFrame control frame payLoadLen ', (t) => {
  var ws = WebSocket(server)
  var finError = new Buffer([0x88,0x7f])
  ws.on('connect',(websocket) => {
    websocket.once('error',(error) => {
      if (error.message === 'Close socket frame payload legnth must be less than 125') {
        t.pass()
      } else {
        t.fail()
      }
      t.end()
      websocket.end()
    })
  })
  
  var client = net.connect({ port:port })
  shakeHand(client,port)
  client.once('data',function(data) {
    client.write(finError)
  })
})

test.serial.cb('Server decodeFrame mask key ', (t) => {
  var ws = WebSocket(server)
  var finError = new Buffer([0x88,0x0f])
  ws.on('connect',(websocket) => {
    websocket.once('error',(error) => {
      if (error.message === 'Miss mask key') {
        t.pass()
      } else {
        t.fail()
      }
      t.end()
      websocket.end()
    })
  })
  ws
  var client = net.connect({ port:port })
  shakeHand(client,port)
  client.once('data',function(data) {
    client.write(finError)
  })
})