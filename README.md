# Weazer
## Présentation technique du projet
Le projet continent un serveur en **Node JS**, qui va faire l'intermédiaire entre les esp's ou les différentes sources d'informations (provenant d'API) et l'interface en **JS/HTML/CSS**.

Le serveur Node utilise [**express**](https://expressjs.com/) pour définir les différentes routes (endpoints) sur lesquelles, on va pouvoir communiquer, comme pour l'inscription et la désinscription, et qui vont également permettre à l'UI, de récupérer les différentes informations à afficher.

Il utilise également [**MQTT**](https://mqtt.org/), afin de récupérer toutes les données de température envoyées par les esp's.

Pour stocker toutes les informations qu'il reçoit, on utilise cloud [**MongoBD**](https://cloud.mongodb.com/).

Pour économiser les requêtes de l'UI vers le serveur, nous avons aussi mis en place des WebSockets avec la librairie [**ws**](https://github.com/websockets/ws).
Le serveur peut donc prévenir l'UI s'il a reçu de nouvelles informations, afin que l'UI fasse les requêtes adaptées pour toujours être à jour !

## API

Nous avons utilisé l'api [**OpenWeather**](https://openweathermap.org/api), qui nous fourni des données (températures + prédictions), pour 10 destinations, avec une requête toutes les 15 minutes (1000 requêtes par jour MAX).

L'api [**BigDataClound**](https://www.bigdatacloud.com/) est également utilisé pour récupérer la ville et le pays des esp's grâce aux coordonnées !

## ESP

Le code arduino est également dans le répertoire, nous utilisons un topic mqtt afin d'envoyer des commandes à notre ESP :
- Inscription
- Début des publications
- Arrêt des publications
- Désinscription 

L'ESP diffuse toutes les cinq minutes, pour éviter le "flood" sur le topic utilisé par tout le monde.

L'ESP accède au broker test.mosquitto.org en utilisant une connexion **TLS**.

La connexion TLS du serveur vers le broker ne semble pas être possible, peut être car nous utilisons gratuitement Heroku et qu'il ne permet pas de connexion TLS, nous avons donc opté pour une connexion basique.

## Pour tester

Si vous souhaitez tester et envoyer la température de votre ESP au serveur, vous pouvez récupérer le code arduino (folder ***esp32_lucioles***) et envoyer le programme "***esp32_lucioles_light.ino***", c'est une version simplifiée de "***esp32_lucioles.ino"***, sans connexion TLS, les champs à remplacer sont indiqués par un commentaire. 
Ne pas oublier de rentrer les informations de connexion dans le fichier ***classic_setup.ino*** pour permettre à l'ESP d'utiliser le wifi. 

Une fois, le programme dans votre ESP et votre ESP connecté au Wifi et au topic MQTT. Vous pouvez utiliser votre topic perso (TOPIC_MANAGEMENT) pour gérer votre ESP, en lui envoyant des ordres :
* ***registration*** ==> Votre esp va envoyer la requête POST pour s'inscrire auprès du serveur.
* ***start*** ==> Votre esp va commencer à publier sur le topic MQTT pour envoyer ses températures toutes les 10 minutes
* ***stop*** ==> Votre esp va arrêter de publier sur le topic MQTT pour envoyer ses températures
* ***cancellation*** ==> Votre esp va envoyer la requête POST pour se désinscrire auprès du serveur. (Toutes les données envoyées précédemment seront supprimés, car eraseData est à true dans le JSON de la requête)


Une fois, votre ESP inscrit, vous devrez patienter jusqu'à sa première diffusion pour le voir apparaitre sur la carte !