const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
let io;

function initSocket(server) {
    io = socketIo(server);

    let clients = [];

    io.on('connection', (socket) => {
        console.log('Cliente Conectou');

        clients.push(socket);
        socket.on('disconnect', () => {
            console.log('Cliente Desconectou');
        })
    })
}

function sendUpdate(message, req) {
    const logFileName = path.join(__dirname, '../logs', req.fileName + '.log');
    io.emit('update', message);
    fs.appendFile(logFileName, `${message}\n`, (err) => {
        if (err) {
            //ERRO IGNORADO
        }
    });
}

function startLoader() {
    io.emit('startLoader');
}

function stopLoader() {
    io.emit('stopLoader');
}

async function erase() {
    io.emit('erase');
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    await delay(1000);
}

module.exports = { initSocket, sendUpdate, startLoader, stopLoader, erase };