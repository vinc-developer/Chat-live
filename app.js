// Modules
let express   = require('express')
let http      = require('http')
let socketio  = require('socket.io')
let morgan    = require('morgan')
let striptags = require('striptags')
let config    = require('./config')

// Constantes
const app     = express()
const server  = http.Server(app)
const io      = socketio(server)
const port    = config.express.port
const options = {
    root: __dirname+'/views'
}

// Variables globales
let usernames = []

// Middlewares
app.use(express.static(options.root))
app.use(morgan('dev'))

// Routes

app.get('/', (req, res) => {
    res.redirect('/home')
})

app.get('/home', (req, res) => {
    res.sendFile('index.html', options)
})

app.get('/params/:name', (req, res) => {
    res.send(req.params.name)
})

// IO

io.on('connection', function (socket) {

    console.log('a user connected : ' + socket.id);

    // Traitement pour l'assignation d'un username
    socket.on('setUsername', (usernameWanted) => {

        // Traitement de la chaine de caractères
        usernameWanted = striptags(usernameWanted.trim())

        // Vérification de l'unicité de l'username
        let usernameTaken = false
        for (let socketid in usernames) {
            if (usernames[socketid] == usernameWanted)
                usernameTaken = true
        }

        let timeFakeLoading = 0
        setTimeout(() => {

            // Traitement final
            if (usernameTaken) {
                socket.emit('rejectUsername', usernameWanted)
            } else {
                socket.join('users', () => {
                    usernames[socket.id] = usernameWanted
                    let justUsernames = getUsernames()
                    socket.emit('acceptUsername', usernameWanted, justUsernames, getSocketIDs())
                    socket.to('users').emit('newUser', usernameWanted, socket.id, justUsernames)
                })
            }

        }, timeFakeLoading);

    })

    // Réception d'un message
    socket.on('sendMessage', (text, dataChat) => {
        text = striptags(text.trim())
        if (text != '') {

            let data = getVariablesDataChat(dataChat, socket.id)

            socket.to(data.roomToSend).emit('newMessage', text, usernames[socket.id], data.chatToShow)
            socket.emit('confirmMessage', text, data.dataChat)

        }
    })

    // Informations sur l'écriture d'un message
    socket.on('startWriting', (dataChat) => {
        let data = getVariablesDataChat(dataChat, socket.id)
        socket.to(data.roomToSend).emit('userStartWriting', usernames[socket.id], data.chatToShow)
    })
    socket.on('stopWriting', (dataChat) => {
        let data = getVariablesDataChat(dataChat, socket.id)
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

// Lancement de l'application
server.listen(port, () => console.log('Server started on port ' + port))

// Renvoie un array contenant uniquement les usernames sans index
function getUsernames() {
    let users = []
    for (let socketid in usernames) {
        users.push(usernames[socketid])
    }
    return users
}

// Renvoie un array contenant uniquement les socketID sans index
function getSocketIDs() {
    let socketIDs = []
    for (let socketid in usernames) {
        socketIDs.push(socketid)
    }
    return socketIDs
}

// Envoie toutes les variables découlant de DataChat
function getVariablesDataChat(dataChat, socketID) {

    dataChat = dataChat == null ? 'person0' : dataChat
    return {
        roomToSend: dataChat == 'person0' ? 'users' : dataChat,
        chatToShow: dataChat == 'person0' ? dataChat : socketID,
        dataChat: dataChat
    }

}
