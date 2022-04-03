//
// Cote UI de l'application "lucioles"
//
// Auteur : G.MENEZ
// RMQ : Manipulation naive (debutant) de Javascript
//
let infoContainer = new InfoContainer();
let chart = new TempChart();
let HOST = location.origin.replace(/^http/, 'ws')
let ws = new WebSocket(HOST);

function init() {
    new NavListeners();
    let node_url = "https://iot906836m1.herokuapp.com";
    let ident_list = [];
    let esp_list = [];
    let log_list = [];
    let api_sources_list = [];

    // Initialisation des différentes données déjà présente sur mongoDB
    getApiSourcesFromNode();
    checkList().then(() => {
        getApiSourcePred();
        getApiDataFromNode()
        getLastDataForEsps();
        refreshLogs();
        addApiMarkers()
    })

    // Loading screen
    let interval = setInterval(() => {
        if (document.getElementById("loading-screen").classList.contains("hidden")) {
            clearInterval(interval);
        }
        waitingGif();
    }, 2000)

    // Réception d'un message via la webSocket
    ws.onmessage = function (event) {
        let msg = JSON.parse(event.data);
        switch (msg.type) {
            case "refresh_temp":
                getLastDataForEsps(); // On récupère les données de tous les ESP de la liste
                break;
            case "refresh_logs":
                refreshLogs(); // On récupère les dernières logs
                break;
            case "refresh_esp_list":
                checkList(); // on compare notre liste d'esps avec celle du serveur et on ajoute les idents des nouveaux
                break;
            case "refresh_api":
                getApiDataFromNode(); // On récupère les températures de l'api
                getApiSourcePred();  // On récupère les prédictions de l'api
                break;
            case "remove_esp":
                removeEsp(msg.ident); // On supprime un esp et son marker
        }
    };

    function addApiMarkers() {
        api_sources_list.forEach((source) => {
            if (source.haslocalisation()) {
                if (!source.getMarker()) { // On créé un marqueur pour la source de l'API si il n'en a pas
                    source.setUpMarker();
                }
            }
        });
    }

    function removeEsp(ident) {
        let esp_to_remove = esp_list.find((el) => el.getIdent() == ident);
        esp_list = esp_list.filter(esp => esp.getIdent() !== ident);
        tempMap.removeLayer(esp_to_remove.getMarker()); // On supprime le marker de l'esp de la carte
    }

    function getLastDataForEsps() {
        esp_list.forEach((esp) => {
            getDataForEsp(esp);
        })
    }

    function waitingGif() {
        let liste = api_sources_list;
        let loadedMarkers = 0;
        liste.forEach((source) => { // On vérifie que toutes les sources d'API ont leur marker
            if (!!source.getMarker()) {
                loadedMarkers++;
            }
        });
        if (loadedMarkers == api_sources_list.length) {
            document.getElementById("loading-screen").classList.add("hidden");
        }
    }

    function getDataForEsp(esp) { // Call vers l'API pour récupérer les données d'un ESP présent dans la liste
        $.ajax({
            url: node_url.concat("/esp/temp?who=" + esp.getIdent()),
            type: 'GET',
            headers: {Accept: "application/json",},
            success: function (resultat, statut) {
                esp.setData(resultat);
                esp.extractLastData();
                if (!esp.getMarker()) {
                    esp.setUpMarker();
                    if (!(esp.getCity() && esp.getCountry())) // On récupère la ville et le pays avec l'API si non définis
                        esp.getLocationName();
                }
            },
            error: function (resultat, statut, erreur) {
            },
            complete: function (resultat, statut) {
            }
        });

    }

    function checkList() { // On compare la liste d'ESP's que l'on a avec la liste d'ESP's renvoyée par l'API
        let new_esp;
        return $.ajax({
            url: node_url.concat("/esp/list"), // URL to "GET" : /esp/temp ou /esp/light
            type: 'GET',
            headers: {Accept: "application/json",},
            success: function (resultat, statut) { // Anonymous function on success
                if (resultat.length > 0) {
                    resultat.forEach((esp) => {
                        if (!ident_list.includes(esp.identification)) {
                            new_esp = new dataSource(esp.user, esp.identification, "esp");
                            ident_list.push(esp.identification);
                            esp_list.push(new_esp);
                            getLastDataForEsps();
                        }
                    })
                }
            },
            error: function (resultat, statut, erreur) {
            },
            complete: function (resultat, statut) {
            }
        });

    }

    function getApiSourcePred() {
        api_sources_list.forEach((source) => {
            $.ajax({
                url: node_url.concat("/api/predict?city=" + source.getCity()),
                type: 'GET',
                headers: {Accept: "application/json",},
                success: function (resultat, statut) {
                    if (resultat[0].pred) {
                        let predict = [];
                        resultat[0].pred.forEach((pred) => {
                            predict.push({"dt": pred.dt * 1000, "temp": pred.temp})
                        });
                        source.setPred(predict);
                    }
                },
                error: function (resultat, statut, erreur) {
                },
                complete: function (resultat, statut) {
                }
            });
        })
    }

    function refreshLogs() { // On récupère les logs stockés sur mongoDB
        let log_container = document.getElementById("logs_container")
        $.ajax({
            url: node_url.concat("/esp/logs"),
            type: 'GET',
            headers: {Accept: "application/json",},
            success: function (resultat, statut) {
                if (resultat.length) {
                    resultat.forEach((log) => {
                        if (!log_list.includes(JSON.stringify(log))) {
                            log_list.push(JSON.stringify(log));
                            log_container.innerHTML += (log.type == "error" ? "<span style='color:red'>" : "<span>") + log.date + ": " + log.msg + "</span><br>";
                        }
                    })
                }
            },
            error: function (resultat, statut, erreur) {
            },
            complete: function (resultat, statut) {
            }
        });
    }

    function getApiSourcesFromNode() { // On crée les différentes sources à partir du fichier JSON présent sur l'API
        $.ajax({
            url: node_url.concat("/api/locations"),
            type: 'GET',
            headers: {Accept: "application/json",},
            success: function (resultat, statut) {
                resultat.forEach((source) => {
                    let newSource = new dataSource(source.city, null, "api");
                    newSource.setLat(source.lat);
                    newSource.setLong(source.long);
                    newSource.setCountry(source.country);
                    newSource.setCity(source.city);
                    api_sources_list.push(newSource);
                })
            },
            error: function (resultat, statut, erreur) {
            },
            complete: function (resultat, statut) {
            }
        });
    }

    function getApiDataFromNode() { // On récupère les données présentes sur mongoDB pour chaque source d'API
        api_sources_list.forEach((source) => {
            $.ajax({
                url: node_url.concat("/api/temp?city=" + source.getCity()),
                type: 'GET',
                headers: {Accept: "application/json",},
                success: function (resultat, statut) {
                    source.setData(resultat);
                    source.extractLastData();
                },
                error: function (resultat, statut, erreur) {
                },
                complete: function (resultat, statut) {
                }
            });
        })
    }
}


//assigns the onload event to the function init.
//=> When the onload event fires, the init function will be run. 
window.onload = init;


