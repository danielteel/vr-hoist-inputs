const express = require('express');
const cors=require('cors');
const net = require('net');

const app = express();
app.use(cors());
app.use(express.json());

let lastHoistCommand=15;
let lastPowerState=32;
let lastJettisonState=34;

let ue4Socket = null;
let inputSocket = null;

const inputServer = net.createServer((socket) => {
    inputSocket=socket;
    const remoteAddress=socket.remoteAddress+':'+socket.remotePort;
    console.log('new inputServer client from ',remoteAddress);

    socket.on('data', onData);
    socket.once('close', onClose);
    socket.on('error', onError);
    function onData(d) {  
        for (const code of d){
            console.log(code);
            if (code<32){
                lastHoistCommand=code;
            }else if (code===32 || code===33){
                lastPowerState=code;
            }else if (code==34 || code===35){
                lastJettisonState=code;
            }
        }
        if (ue4Socket) ue4Socket.write(d);
    }
    function onClose() {
        inputSocket=null;
        console.log('input connection from %s closed', remoteAddress);  
    }
    function onError(err) {  
        console.log('input Connection %s error: %s', remoteAddress, err.message);  
    }  
});

const ue4Server = net.createServer((socket) => {
    ue4Socket=socket;
    const remoteAddress=socket.remoteAddress+':'+socket.remotePort;
    console.log('new UE4 client from ',remoteAddress);

    socket.on('data', onData);
    socket.once('close', onClose);
    socket.on('error', onError);


    socket.write(Uint8Array.from([lastPowerState, lastHoistCommand, lastJettisonState]))
    console.log(Uint8Array.from([lastPowerState, lastHoistCommand, lastJettisonState]));
    function onData(d) {  
        console.log('RADALT:',d[0]*2);
        console.log('HOIST OUT:',d[1]);
    }
    function onClose() {  
        ue4Socket=null;
        console.log('ue4 connection from %s closed', remoteAddress);  
    }
    function onError(err) {  
        console.log('ue4 Connection %s error: %s', remoteAddress, err.message);  
    }  
});

app.get('/reset', (req, res)=>{
    if (ue4Socket){
        ue4Socket.write(Uint8Array.from([255]));
        return res.status(200).json({message: 'success'});
    } else {
        return res.status(400).json({error: 'Game isnt connected'});
    }
});

app.use(express.static('public'));

app.listen(3000, () => console.log('express listening on 3000') );

inputServer.listen(3001, () => console.log('input server listening to ',inputServer.address()) );

ue4Server.listen(3002, () => console.log('UE4 server listening to ',ue4Server.address()) );