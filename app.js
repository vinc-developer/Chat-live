// Modules
let express   = require('express');
let http      = require('http');
let socketIo  = require('socket.io');
let morgan    = require('morgan');
let striptags = require('striptags');
let config    = require('./config.json');
const cors = require('cors');

// Constantes
const ex     = express();
const app  = http.createServer(ex);
const io      = socketIo(app);
const port    = config.express.port;
const options = {
    root: __dirname+'/views'
}

// Variables globales
let usernames = []

// Middlewares
ex.use(express.static(options.root))
ex.use(morgan('dev'))
ex.use(cors());
/*
ex.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    next();
});
*/
// Routes

ex.get('/', (req, res) => {
    res.redirect('/home')
})

ex.get('/home', (req, res) => {
    res.sendFile('index.html', options)
})

ex.get('/params/:name', (req, res) => {
    res.send(req.params.name)
})

// IO

io.on('connection', socket => {

    console.log('a user connected : ' + socket.id);

    // Traitement pour l'assignation d'un username
    socket.on('setUsername', (usernameWanted) => {

        // Traitement de la chaine de caractères
        usernameWanted = striptags(usernameWanted.trim());

        // Vérification de l'unicité de l'username
        let usernameTaken = false
        for (let socketid in usernames) {
            if (usernames[socketid] === usernameWanted)
                usernameTaken = true
        }

        let timeFakeLoading = 0;
       setTimeout(() => {

            // Traitement final
            if (usernameTaken) {
                socket.emit('rejectUsername', usernameWanted);
            } else {
                socket.join('users')
                    usernames[socket.id] = usernameWanted;
                    let justUsernames = getUsernames();
                    socket.emit('acceptUsername', usernameWanted, justUsernames, getSocketIDs());
                    socket.to('users').emit('newUser', usernameWanted, socket.id, justUsernames);
            }
            
        });
    });

    //Reception d'un message

    socket.on('sendMessage', (text, dataChat) => {
        text = striptags(text.trim());
        if(text !== ''){
            let data = getVariablesDataChat(dataChat, socket.id);
            socket.to(data.roomToSend).emit('newMessage', text, usernames[socket.id], data.chatToShow);
            socket.emit('confirmMessage', text, data.dataChat);
        }

    })

    //information ebn cour d'ceriture
    socket.on('startWriting', (dataChat) => {
        let data = getVariablesDataChat(dataChat, socket.id);
        socket.to(data.roomToSend).emit('userStartWriting', usernames[socket.id], data.chatToShow);
    })
    socket.on('stopWriting', (dataChat) => {
        let data = getVariablesDataChat(dataChat, socket.id);
        socket.to(data.roomToSend).emit('userStopWriting', data.chatToShow)
    })

    // Déconnexion de l'utilisateur
    socket.on('disconnect', () => {
        if (usernames[socket.id]) {
            delete usernames[socket.id]
            socket.to('users').emit('leftUser', socket.id, getUsernames())
        }
    })

});



// Renvoie un array contenant uniquement les usernames sans index
function getUsernames() {
    let users = []
    for (let u in usernames) {
        users.push(usernames[u])
    }
    return users
}

// Renvoie un array contenant uniquement les socketId sans index
function getSocketIDs() {
    let socketIDs = []
    for (let socketid in usernames) {
        socketIDs.push(socketid)
    }
    return socketIDs;
}

function getVariablesDataChat(dataChat, socketID){
    dataChat = dataChat == null ? 'person0' : dataChat;
    return {
        roomToSend: dataChat === 'person0' ? 'users' : dataChat,
        chatToShow: dataChat === 'person0' ? dataChat : socketID,
        dataChat: dataChat
    }


}
// Lancement de l'application
app.listen(3300, () => console.log(`Server started on port : ${3300}`));
