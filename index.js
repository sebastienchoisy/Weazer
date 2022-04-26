const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const bodyParser = require('body-parser');
const SocketServer = require('ws').Server;
const app = express();

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(express.static(__dirname + '/public'));
app.use(function (request, response, next) { //Pour eviter les problemes de CORS/REST
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "*");
    response.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
    next();
});
// Route / => Le node renvoie la page HTML affichant les charts
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/ui_lucioles.html');
});

let server = app.listen(process.env.PORT || 3000, () => {
    console.log('Server listening on port 3000');
});
// websocket qui fait office de webhook
const wss = new SocketServer({server});
wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
});

function sendMessageToClients(message) {
    wss.clients.forEach((client) => {
        client.send(message);
    });
}

//--- MQTT module
const mqtt = require('mqtt');

// Topic MQTT
const TOPIC_TEMP = 'iot/M1Miage2022/temp';

//---  The MongoDB module exports MongoClient, and that's what
// we'll use to connect to a MongoDB database.
// We can use an instance of MongoClient to connect to a cluster,
// access the database in that cluster,
// and close the connection to that cluster.
const {MongoClient} = require('mongodb');

//----------------------------------------------------------------
// This function will retrieve a list of databases in our cluster and
// print the results in the console.
async function listDatabases(client) {
    let databasesList = await client.db().admin().listDatabases();

    console.log("Databases in Mongo Cluster : \n");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
}


//----------------------------------------------------------------
// asynchronous function named main() where we will connect to our
// MongoDB cluster, call functions that query our database, and
// disconnect from our cluster.
async function v0() {

    const mongoName = "lucioles"         //Nom de la base
    const mongoUri = process.env.mongodb;

    //Now that we have our URI, we can create an instance of MongoClient.
    const mg_client = new MongoClient(mongoUri,
        {useNewUrlParser: true, useUnifiedTopology: true});

    // Connect to the MongoDB cluster
    mg_client.connect(function (err, mg_client) {
        if (err) throw err; // If connection to DB failed ...

        //===============================================
        // Print databases in our cluster
        listDatabases(mg_client);

        //===============================================
        // Get a connection to the DB "lucioles" or create
        let dbo = mg_client.db(mongoName);

        // On rempli notre collection API avec les données de l'api OpenWeather
        let data = require("./public/assets/api-locations.json");
        let apikey = process.env.openweather_key;

        async function getDataFromAPI(lat, long) {
            let url = "https://api.openweathermap.org/data/2.5/onecall?lat=" + lat + "&lon=" + long + "&exclude=hourly,minutely,alerts&units=metric&appid=" + apikey;
            return await fetch(url).then((response) => response.json());
        }

        function fetchDataForAllAPI() {
            data.forEach((source) => {
                let apiData;
                getDataFromAPI(source.lat, source.long).then((res) => {
                    apiData = res;
                    let pred_entry = {
                        city: source.city,
                        pred: apiData.daily
                    }
                    let api_entry = {
                        date: apiData.current.dt * 1000 + apiData.timezone_offset * 1000 - 7200000,
                        city: source.city,
                        country: source.country,
                        value: apiData.current.temp
                    }
                    dbo.collection("api").insertOne(api_entry, function (err, res) {
                        if (err) throw err;
                    });
                    dbo.collection("api-pred").insertOne(pred_entry, function (err, res) {
                        if (err) throw err;
                    });
                    sendMessageToClients(JSON.stringify({type: "refresh_api"}));
                })
            })
        }
        setInterval(() => {
            fetchDataForAllAPI();
        }, 1740000) // call/29min

        //===============================================
        // Connexion au broker MQTT distant
        setInterval(() => {
            sendMessageToClients(JSON.stringify({type: "keep-alive"}));
        }, 30000)

        const mqtt_url = 'http://test.mosquitto.org:1883';
        const client_mqtt = mqtt.connect(mqtt_url);

        client_mqtt.on('message', mqqt_callback);

        client_mqtt.on('connect', function () {

            client_mqtt.subscribe(TOPIC_TEMP, function (err) {
                if (!err) {
                    console.log('Node Server has subscribed to ', TOPIC_TEMP);
                }
            })
        })

        function insertLogWithUser(date, user, ident, type, msg) {
            let new_Error = {
                date: date.toLocaleString('fr-FR'),
                type: type,
                msg: ident + ": " + user + " > " + msg + "<br>",
            }
            dbo.collection("logs").insertOne(new_Error, function (err, res) {
                if (err) throw err;
                sendMessageToClients(JSON.stringify({type: "refresh_logs"}));
            });
        }

        function insertErrorLogWithoutUser(date, msg) {
            let new_Error = {
                date: date.toLocaleString('fr-FR'),
                type: "error",
                msg: msg + "<br>",
            }
            dbo.collection("logs").insertOne(new_Error, function (err, res) {
                if (err) throw err;
                sendMessageToClients(JSON.stringify({type: "refresh_logs"}));
            });
        }

        //================================================================
        // Callback de la reception des messages MQTT pour les topics sur
        // lesquels on s'est inscrit.

        async function mqqt_callback(topic, message) {
            console.log("\nMQTT msg on topic : ", topic.toString());
            console.log("Msg payload : ", message.toString());
            // let frTime = new Date(new Date().getTime() + 120 * 60000);
            let frTime = new Date();
            // Parsing du message suppos� recu au format JSON
            message = JSON.parse(message.toString());
            let msg = "";

            //<------------------------------------ RECEPTION DES DONNEES ---------------------------------->
            // On vérifie que le JSON est correct et que l'appareil est bien inscrit
            if (!("info" in message && "ident" in message.info && "status" in message && "temperature" in message.status && "loc" in message.status
                && "latitude" in message.status.loc && "longitude" in message.status.loc)) {

                if (!("info" in message && "ident" in message.info && "user" in message.info) || (message.info.ident.length === 0 || message.info.user.length === 0)) {
                    msg = "Mauvais JSON: erreur d'authentification (<b>identification manquante</b>)"
                    insertErrorLogWithoutUser(frTime, msg);

                } else if (!("status" in message && "temperature" in message.status) || message.status.temperature.length === 0) {
                    msg = "Mauvais JSON: Erreur dans le JSON (<b>temperature manquante</b>)";
                    insertLogWithUser(frTime, message.info.user, message.info.ident, "error", msg);

                } else if (!("loc" in message.status && "latitude" in message.status.loc && "longitude" in message.status.loc)) {
                    msg = "Mauvais JSON: Erreur dans le JSON (<b>localisation manquante</b>)"
                    insertLogWithUser(frTime, message.info.user, message.info.ident, "error", msg);
                } else {
                    msg = "Mauvais JSON: Erreur dans le JSON"
                    insertLogWithUser(frTime, message.info.user, message.info.ident, "error", msg);
                }
            } else {
                let temp = message.status.temperature;
                let localisation = message.status.loc;
                let ident = message.info.ident;
                let user = message.info.user
                if (await dbo.collection("esp").countDocuments({identification: ident})) {
                    let new_entry =
                        {
                            date: frTime,
                            identification: ident,      // identify ESP who provide
                            value: temp,
                            localisation: localisation
                        };
                    dbo.collection("temp").insertOne(new_entry, function (err, res) {
                        if (err) throw err;
                        console.log("\nItem : ", new_entry,
                            "\ninserted in db in collection : temp");
                        sendMessageToClients(JSON.stringify({type: "refresh_temp"}));
                    });
                } else {
                    let msg = " Veuillez vous inscrire avant de diffuser";
                    insertLogWithUser(frTime, user, ident, "error", msg)
                }
            }
        }


        // ROUTES

        app.get('/esp/temp', function (req, res) {
            console.log(req.originalUrl);

            let wh = req.query.who // get the "who" param from GET request

            console.log("\n--------------------------------");
            console.log("A client/navigator ", req.ip);
            console.log("sending URL ", req.originalUrl);
            console.log("values from object ", wh);

            // R�cup�ration des nb derniers samples stock�s dans
            const nb = 200;
            dbo.collection("temp").find({identification: wh}).sort({_id: -1}).limit(nb).toArray(function (err, result) {
                if (err) throw err;
                res.json(result.reverse());
            });
        });


        //path qui retourne la liste des esp avec leur identification et leur user
        app.get('/esp/list', function (req, res) {

            dbo.collection("esp").find().toArray(function (err, result) {
                if (err) throw err;
                res.json(result);
            });

        });
        //path qui retourne la liste des logs
        app.get('/esp/logs', function (req, res) {
            dbo.collection("logs").find().toArray(function (err, result) {
                if (err) throw err;
                res.json(result);
            });
        });
        app.get('/api/locations', function (req, res) {
            let data = require("./public/assets/api-locations.json");
            res.json(data);
        });
        app.get('/api/temp', async function (req, res) {
            let city = req.query.city;
            dbo.collection("api").find({city: city}).sort({_id:-1}).limit(200).toArray(function (err, result) {
                if (err) throw err;
                res.json(result.reverse());
            });
        });
        app.get('/api/predict', async function (req, res) {
            let city = req.query.city;
            dbo.collection("api-pred").find({city: city}).sort({_id:-1}).limit(1).toArray(function (err, result) {
                if (err) throw err;
                res.json(result);
            });
        });
        app.post('/esp/registration', async function (req, res) {
            let body = req.body;
            let frTime = new Date();
            if ("user" in body && "ident" in body && "secret" in body) {
                let ident = body.ident;
                let name = body.user;
                let secret = body.secret;

                if (!await dbo.collection("esp").countDocuments({identification: ident})) {
                    let esp_entry = {
                        identification: ident,      // identify ESP who provide
                        user: name,
                        secret: secret
                    };
                    dbo.collection("esp").insertOne(esp_entry, function (err, res) {
                        if (err) throw err;
                        sendMessageToClients(JSON.stringify({type: "refresh_esp_list"}));
                    });
                    res.send("Inscription réussie");
                    insertLogWithUser(frTime, name, ident, "info", "Inscription réussie")
                } else {
                    res.send("Appareil déjà enregistré");
                    insertLogWithUser(frTime, name, ident, "error", "Appareil déjà enregistré")
                }
            }
        });
        app.post('/esp/cancellation', async function (req, res) {
            let body = req.body;
            let frTime = new Date();
            if ("user" in body && "ident" in body && "secret" in body) {
                let ident = body.ident;
                let user = body.user;
                let document = await dbo.collection("esp").findOne({identification: ident})
                if (document) {
                    if (document.secret == body.secret) {
                        await dbo.collection("esp").deleteOne({identification: ident});
                        sendMessageToClients(JSON.stringify({type: "remove_esp", ident: ident}));
                        res.send("Désinscription réussie");
                    } else {
                        insertLogWithUser(frTime, user, ident, "error", "Impossible de désinscrire (<b> mauvais secret<b>)");
                        res.send("Impossible de se désinscrire ( mauvais secret )");
                    }
                } else {
                    insertLogWithUser(frTime, user, ident, "error", "Impossible de désinscrire (<b> esp inexistant<b>)");
                    res.send("Impossible de se désinscrire ( esp inexistant )");
                }
            }
        });

        //================================================================
        // Fermeture de la connexion avec la DB lorsque le NodeJS se termine.
        //
        process.on('exit', (code) => {
            if (mg_client && mg_client.isConnected()) {
                console.log('mongodb connection is going to be closed ! ');
                mg_client.close();
            }
        })

    });// end of MongoClient.connect
}// end def main

//================================================================
//==== Demarrage BD et MQTT =======================
//================================================================
v0().catch(console.error);
