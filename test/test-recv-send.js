import test from 'ava'
import WebSocket from '..'
import http from 'http'
import net from 'net'

var server = null
var port = null

// hello world
var strBuf = new Buffer([0x81,0x8b,0xac,0xd7,0x32,0x47,0xc4,
0xb2,0x5e,0x2b,0xc3,0xf7,0x45,0x28,0xde,0xbb,0x56])
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
  var firstByte  = data[0]
  var secondByte = data[1]
  var opcode     = firstByte & 0x0f
  var hasMask    = secondByte >> 7
  var start      = hasMask ? 6:2
  var payLoadLen = secondByte & 0x7f
  var mask       = []

  var payload = data.slice(start, start + payLoadLen)
  if (hasMask) {
    mask = data.slice(start - 4, start)
    var payloadDataLen = payload.length
    for (i = 0; i < payloadDataLen; i++) {
      payload[i] ^= mask[i % 4]
    }
  }
  return { opcode,payload }
}

test.beforeEach.cb("Start a easy-websocket Server", (t) => {
  server = new http.Server()
  server.listen(() => {
    port = server.address().port
    t.end()
  })
})

test.afterEach.cb((t) => {
  server.close(() => {
    t.end()
  })
})

test.serial.cb('Server send Type', (t) => {
  var ws = WebSocket(server)
  ws.on('connect',(websocket) => {
    websocket.on('data',(obj) => {
      try {
        ws.send("hello world",'error-type')
        t.fail()
      } catch(e) {
        t.pass()
      }
      websocket.end()
      t.end()
    })
  })
  var flag = false
  var client = net.connect({ port:port })
  shakeHand(client,port)
  client.on('data',function(data) {
    if (!flag) {
      flag = true
      client.write(strBuf)
      return
    }
  })
})

function sendText(t,text) {
  var len = Math.round(Math.random()*30+0.5)
  var str = Math.random().toString(35).substr(2, len)
  var ws = WebSocket(server)
  var wss
  ws.on('connect',(websocket) => {
    wss = websocket;
    websocket.on('data',(obj) => {
      websocket.send(str,text)
    })
  })

  var flag = false
  var client = net.connect({ port:port })
  shakeHand(client,port)
  client.on('data',function(data) {
    if (!flag) {
      client.write(strBuf)
      flag = true
    } else {
      var { payload } = getPayload(data)
      if (str === payload.toString()) {
        t.pass()  
      } else {
        t.fail()
      }
      t.end()
      wss.end()
    }
  })
}

test.serial.cb('Server send default', (t) => {
  sendText(t)
})

test.serial.cb('Server send text', (t) => {
  sendText(t,'text')
})

function sendBinary(t,bin) {
  var ws = WebSocket(server)
  var wss
  ws.on('connect',(websocket) => {
    wss = websocket
    websocket.on('data',(obj) => {
      websocket.send(bin,'binary')
    })
  })

  var flag = false
  var client = net.connect({ port:port })
  shakeHand(client,port)
  client.on('data',function(data) {
    if (!flag) {
      client.write(strBuf)
      flag = true
    } else {
      var { payload } = getPayload(data)
      if (payload.toString() === bin.toString()) {
        t.pass()
      } else {
        t.fail()
      }
      t.end()
      wss.end()
    }
  })
}

test.serial.cb('Server send binary', (t) => {
  var bin = new Buffer([0x82,0x80,0x82,0x80])  
  sendBinary(t,bin)
})

function sendError(t,data) {
  var ws = WebSocket(server)
  ws.on('connect',(websocket) => {
    try {
      websocket.send(data,3)  
      t.fail()  
    } catch(e) {
      t.pass()
    }
    t.end()
    websocket.end()
  })

  var flag = false
  var client = net.connect({ port:port })
  shakeHand(client,port)
}

test.serial.cb('Server send error type', (t) => {
  var bin = new Buffer([0x83,0x80,0x82,0x80])  
  sendError(t,bin)
})

test.serial.cb('Server recv/send 2 bytes len data', (t) => {
  t.plan(2)
  var len = Math.round((1+Math.random()) * 10000 + 0.5)
  var buf = new Buffer(2)
  buf.writeUInt16BE(len,0)
  var tmp = new Buffer(len)
  var ws = WebSocket(server)
  var send = false
  var wss
  ws.on('connect',(websocket) => {
    wss = websocket
    websocket.on('data',(obj) => {
      if (obj.buffer.length === len) {
        t.pass()
      } else {
        t.fail()
      }
      websocket.send(obj.buffer,'binary')
      send = true
    })
  })
  var client = net.connect({ port:port })
  shakeHand(client,port)
  client.on('data',function(data) {
    if (send) {
      t.pass()
      t.end()
      wss.end()
      return
    }
    var bigData = new Buffer([0x82,0xfe,...buf,0xc3,0x20,0x44,0xc9])
    bigData = Buffer.concat([bigData,tmp],bigData.length+len)
    client.write(bigData)
  })
})

test.serial.cb('Server recv/send 8 bytes len data', (t) => {
  t.plan(2)
  var len = Math.round((1+Math.random()) * 6055360 + 0.5)
  var buf = new Buffer(8)
  buf.writeUIntBE(len,0,8)
  var tmp = new Buffer(len)
  var ws = WebSocket(server,{
    enablePing:false
  })
  var send = false
  var wss
  ws.on('connect',(websocket) => {
    wss = websocket
    websocket.on('data',(obj) => {
      if (obj.buffer.length === len) {
        t.pass()
      } else {
        t.fail()
      }
      websocket.send(obj.buffer,'binary')
      send = true
    })
  })
  
  var client = net.connect({ port:port })
  shakeHand(client,port)
  client.once('data',function(data) {
    var bigData = new Buffer([0x82,0xff,...buf,0xc3,0x20,0x44,0xc9])
    bigData = Buffer.concat([bigData,tmp],bigData.length+len)
    client.write(bigData)
  })
  var d = new Buffer(0)
  var payloadlen = 0
  client.on('data',function(data) {
    if (send) {
      d = Buffer.concat([d,data],d.length+data.length) 
      if (!payloadlen && d[1] === 127) {
        payloadlen = d.readUIntBE(2,8)
      }
      // no mask
      if (d.length === (payloadlen+10)) {
        t.pass()
        t.end()
        wss.end()
      }
    }
  })
})

test.serial.cb('Server continuous Frames', (t) => {
  var len = Math.round((1+Math.random()) * 10000 + 0.5)
  var buf = new Buffer(2)
  buf.writeUInt16BE(len,0)
  var tmp = new Buffer(len)
  var ws = WebSocket(server,{
    enablePing:false
  })
  ws.on('connect',(websocket) => {
    websocket.on('data',(obj) => {
      if (obj.buffer.length === len * 3) {
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
  client.on('data',function(data) {
    var buf1 = new Buffer([0x02,0xfe,...buf,0xc3,0x20,0x44,0xc9])
    var buf2 = new Buffer([0x02,0xfe,...buf,0xc3,0x20,0x44,0xc9])
    var buf3 = new Buffer([0x82,0xfe,...buf,0xc3,0x20,0x44,0xc9])
    buf1 = Buffer.concat([buf1,tmp],buf1.length+len)
    buf2 = Buffer.concat([buf2,tmp],buf2.length+len)
    buf3 = Buffer.concat([buf3,tmp],buf3.length+len)
    client.write(buf1)
    client.write(buf2)
    client.write(buf3)
  })
})

