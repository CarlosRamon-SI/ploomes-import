require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');

// const uk = 'B38DB6EA332C1BD797F9906F9ADB3F8AC3826BBD3DF61007C71010C722C07F54B2F02D85FBF53B5CD2374FA19E7A38437F5363D1CDBE6B7B9CAE5AB9218C1FAF';
const app = express();
const server = http.createServer(app);

const downloadRoutes = require('./routes/download');
const uploadRoutes = require('./routes/upload');
const produtosRoutes = require('./routes/produtos');
const api = require('./routes/api');
const { initSocket } = require('./services/socket');

const port = 3000;

let memoria = {};
memoria.macroId = '';
memoria.macroName = '';
memoria.macroGroupId = '';

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(downloadRoutes);
app.use(uploadRoutes);
app.use(produtosRoutes);
app.use(api);

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.render('index', {title: 'Home'})
});

initSocket(server);

server.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});