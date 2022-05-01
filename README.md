# Weazer
## Présentation technique du projet
Le projet continent un serveur en **Node JS**, qui va faire l'intermédiaire entre les esp's ou les différentes sources d'informations (provenant d'API) et l'interface en **JS/HTML/CSS**.

Le serveur Node utilise [**express**](https://expressjs.com/) pour définir les différentes routes (endpoints) sur lesquelles, on va pouvoir communiquer, comme pour l'inscription et la désinscription, et qui vont également permettre à l'UI, de récupérer les différentes informations à afficher.

Il utilise également [**MQTT**](https://mqtt.org/), afin de récupérer toutes les données de température envoyées par les esp's.

Pour stocker toutes les informations qu'il reçoit, on utilise cloud [**MongoBD**](https://cloud.mongodb.com/).

Pour économiser les requêtes de l'UI vers le serveur, nous avons aussi mis en place des WebSockets avec la librairie [**ws**](https://github.com/websockets/ws).
Le serveur peut donc prévenir l'UI s'il a reçu de nouvelles informations, afin que l'UI fasse les requêtes adaptées pour toujours être à jour !

## API

Nous avons utilisé l'api [**OpenWeather**](https://openweathermap.org/api), qui nous fourni des données (températures + prédictions), pour quelques locations, avec une requête toutes les 29 minutes (1000 requêtes par jour MAX).

Il est possible d'ajouter et supprimer des locations à partir de l'application.

L'api [**BigDataClound**](https://www.bigdatacloud.com/) est également utilisé pour récupérer la ville et le pays des esp's et des locations OpenWeather ajoutées, grâce aux coordonnées !

## ESP

Le code arduino est également dans le répertoire.

L'ESP diffuse toutes les cinq minutes, pour éviter le "flood" sur le topic utilisé par tout le monde.

L'ESP accède au broker test.mosquitto.org en utilisant une connexion **TLS**.

La connexion TLS du serveur vers le broker ne semble pas être possible, peut être car nous utilisons gratuitement Heroku et qu'il ne permet pas de connexion TLS, nous avons donc opté pour une connexion basique.

