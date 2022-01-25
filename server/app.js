const net = require('net');

let lastHoistCommand = 15;
let lastPowerState = 0;

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


    socket.write(Uint8Array.from([lastPowerState, lastHoistCommand]))
    console.log(Uint8Array.from([lastPowerState, lastHoistCommand]));
    function onData(d) {  
    }
    function onClose() {  
        ue4Socket=null;
        console.log('ue4 connection from %s closed', remoteAddress);  
    }
    function onError(err) {  
        console.log('ue4 Connection %s error: %s', remoteAddress, err.message);  
    }  
});


inputServer.listen(3001, ()=>{
    console.log('input server listening to ',inputServer.address());
});


ue4Server.listen(3002, ()=>{
    console.log('UE4 server listening to ',ue4Server.address());
});
