import test from 'ava';
import WebSocket from '..';
import http from 'http';
import net from 'net';
var server = null;
var port = null;

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

function authFail(req) {
  return 'no auth'
}

function authSucess(req) {
  return 
}

test.serial.cb('Server check auth', (t) => {
  var ws = WebSocket(server);
  ws.auth = authFail;
  var client = net.connect({ port:port })
  shakeHand(client,port)

  client.on('data',(msg) => {
    if (msg.toString() == 'no auth') {
      t.pass()
    } else {
      t.fail()
    }
    t.end()
  })

})

test.serial.cb('Server check auth', (t) => {
  var ws = WebSocket(server);
  ws.auth = authSucess;
  var websocket;  
  ws.on('connect',(s) => {
    websocket = s;
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
    websocket.end()
  })
})

test.serial.cb('Server req header origin', (t) => {
  var ws = WebSocket(server);

  var client = net.connect({ port:port })
  client.write(
    'GET ws://localhost:' + port + '/ws HTTP/1.1\n' +
    // 'Origin: http://localhost:' + port + '\n' +
    'Host: localhost:' + port + '\n' +
    'Sec-WebSocket-Key: a-test-key==\n' +
    'Upgrade: websocket\n' +
    'Connection: Upgrade\n' +
    'Sec-WebSocket-Version: 13\n\r\n\r\n'
  )

  client.on('data',(msg) => {
    if (msg.toString() == 'origin header is not exist') {
      t.pass()
    } else {
      t.fail()
    }
    t.end()
  })

})

test.serial.cb('Server req header host', (t) => {
  var ws = WebSocket(server);

  var client = net.connect({ port:port })
  client.write(
    'GET ws://localhost:' + port + '/ws HTTP/1.1\n' +
    'Origin: http://localhost:' + port + '\n' +
    // 'Host: localhost:' + port + '\n' +
    'Sec-WebSocket-Key: a-test-key==\n' +
    'Upgrade: websocket\n' +
    'Connection: Upgrade\n' +
    'Sec-WebSocket-Version: 13\n\r\n\r\n'
  )

  client.on('data',(msg) => {
    if (msg.toString() == 'host header is not exist') {
      t.pass()
    } else {
      t.fail()
    }
    t.end()
  })

})

test.serial.cb('Server req header host/origin', (t) => {
  var ws = WebSocket(server);

  var client = net.connect({ port:port })
  client.write(
    'GET ws://localhost:' + port + '/ws HTTP/1.1\n' +
    'Origin: http://127.0.0.1:' + port + '\n' +
    'Host: localhost:' + port + '\n' +
    'Sec-WebSocket-Key: a-test-key==\n' +
    'Upgrade: websocket\n' +
    'Connection: Upgrade\n' +
    'Sec-WebSocket-Version: 13\n\r\n\r\n'
  )

  client.on('data',(msg) => {
    if (msg.toString().indexOf('403 forbidden') !== -1) {
      t.pass()
    } else {
      t.fail()
    }
    t.end()
  })

})