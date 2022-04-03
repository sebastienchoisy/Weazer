/*
 * Auteur : G.Menez
 */

// SPIFFS
#include <SPIFFS.h>
// OTA
#include <ArduinoOTA.h>
#include "ota.h"
// Capteurs
#include "OneWire.h"
#include "DallasTemperature.h"
// Wifi (TLS) https://github.com/espressif/arduino-esp32/tree/master/libraries/WiFiClientSecure
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include "ArduinoJson.h"
#include "classic_setup.h"
// MQTT https://pubsubclient.knolleary.net/
#include <PubSubClient.h>
#include <HTTPClient.h>

/*===== ESP GPIO configuration ==============*/
/* ---- LED         ----*/
const int LEDpin = 19; // LED will use GPIO pin 19
/* ---- Light       ----*/
const int LightPin = A5; // Read analog input on ADC1_CHANNEL_5 (GPIO 33)
/* ---- Temperature ----*/
OneWire oneWire(23); // Pour utiliser une entite oneWire sur le port 23
DallasTemperature TempSensor(&oneWire) ; // Cette entite est utilisee par le capteur de temperature


String whoami; // Identification de CET ESP au sein de la flotte
HTTPClient http;
/*===== MQTT broker/server and TOPICS ========*/
String MQTT_SERVER = "test.mosquitto.org";

int MQTT_PORT = 1883;

//==== MQTT TOPICS ==============
#define TOPIC_TEMP "iot/M1Miage2022/temp"
#define TOPIC_MANAGEMENT "votre/topic/perso" // Topic pour gérer votre ESP

//==== ESP is MQTT Client =======
WiFiClient espClient;              // Wifi
PubSubClient client(espClient);

String username = "votre_username";  //  <======== REMPLACER PAR VOTRE USERNAME ========>
String secret = "votre_secret";  //      <======== REMPLACER PAR VOTRE MOT SECRET ========>
boolean isPublishing = false;
StaticJsonDocument<256> jdoc;
char jpayload[256];

/*============== MQTT CALLBACK ===================*/

/*============== CALLBACK ===================*/
void mqtt_pubcallback(char* topic, 
                      byte* message, 
                      unsigned int length) {
  /* 
   * Callback if a message is published on this topic.
   */
  Serial.print("Message arrived on topic : ");
  Serial.println(topic);
  String messageTemp ;
  int http_response = 0;
  if(String(topic) == TOPIC_MANAGEMENT) {
    for(int i = 0 ; i < length ; i++) {
    messageTemp += (char) message[i];
    }
    if(messageTemp == "registration"){
       Serial.println("Demande d'inscription");
       createJsonRegistration();
       http.begin("https://iot906836m1.herokuapp.com/esp/registration");
       http.addHeader("Content-Type", "application/json");
       http_response = http.POST(jpayload);
       if(http_response>0){
        Serial.println(http.getString());
       }
       http.end();
    } else if(messageTemp == "cancellation"){
      isPublishing = false;
      createJsonCancellation(true);
      Serial.println("Demande de désinscription");
      http.begin("https://iot906836m1.herokuapp.com/esp/cancellation");
      http.addHeader("Content-Type", "application/json");
      http_response = http.POST(jpayload);
       if(http_response>0){
        Serial.println(http.getString());
       }
      http.end();
    } else if(messageTemp == "start"){
      isPublishing = true;
      Serial.println("Demarrage des publications");
    } else if(messageTemp == "stop"){
      isPublishing = false;
       Serial.println("Arrêt des publications");
    }
  }
}


void createJsonTemp(){
  jdoc.clear();
  jdoc["status"]["temperature"]= get_temperature();
  jdoc["status"]["light"]= get_light();
  jdoc["status"]["loc"]["longitude"]= -122.4194; //  <======== REMPLACER PAR VOTRE LONGITUDE ET VOTRE LATITUDE ========>
  jdoc["status"]["loc"]["latitude"]= 37.7749;
  jdoc["info"]["user"]= username;
  jdoc["info"]["ident"] = whoami;
  serializeJson(jdoc, jpayload);
}
void createJsonRegistration(){
  jdoc.clear();
  jdoc["user"]= username;
  jdoc["ident"] = whoami;
  jdoc["secret"] = secret;
  serializeJson(jdoc, jpayload);
}
void createJsonCancellation(boolean eraseData){
  jdoc.clear();
  jdoc["user"]= username;
  jdoc["ident"] = whoami;
  jdoc["secret"] = secret;
  jdoc["eraseData"] = eraseData;
  serializeJson(jdoc, jpayload);
}

/*============= CONNECT and SUBSCRIBE =====================*/

void mqtt_connect() {
  /*
     Subscribe to a MQTT topic
  */
 
  while (!client.connected()) { // Loop until we're reconnected
    Serial.print("Attempting MQTT connection...");

    // Attempt to connect => https://pubsubclient.knolleary.net/api
    if (client.connect(mqtt_id,      /* Client Id when connecting to the server */
                       mqtt_login,   /* With credential */
                       mqtt_passwd)) {
      Serial.println("connected");
      client.subscribe(TOPIC_MANAGEMENT);
    }
    else {
      Serial.print("failed, rc=");
      Serial.print(client.state());

      Serial.println(" try again in 5 seconds");
      delay(5000); // Wait 5 seconds before retrying
    }
  }
}

void mqtt_subscribe() {
   if (!client.connected()) { 
      mqtt_connect();
      client.subscribe(TOPIC_MANAGEMENT);
   }
}

void setup_mqtt_server() {
  // set server of our client
  client.setServer(MQTT_SERVER.c_str(), MQTT_PORT);
  // set callback when publishes arrive for the subscribed topic
  client.setCallback(mqtt_pubcallback);
}
/*============= ACCESSEURS ====================*/

float get_temperature() {
  float temperature;
  TempSensor.requestTemperaturesByIndex(0);
  delay (750);
  temperature = TempSensor.getTempCByIndex(0);
  return temperature;
}

float get_light(){
  return analogRead(LightPin);
}

void set_pin(int pin, int val){
 digitalWrite(pin, val) ;
}

int get_pin(int pin){
  return digitalRead(pin);
}
static uint32_t tick = 0;


/*=============== SETUP =====================*/
void setup () {
  Serial.begin(9600);
  while (!Serial); // wait for a serial connection. Needed for native USB port only

  // Connexion Wifi
  connect_wifi();
  print_network_status();

  /* Choix d'une identification pour cet ESP ---*/
  whoami =  String(WiFi.macAddress());

  // Initialize the LED
  setup_led(LEDpin, OUTPUT, LOW);

  // Init temperature sensor
  TempSensor.begin();

  // Initialize SPIFFS
  SPIFFS.begin(true);

  setup_mqtt_server();
  mqtt_connect();
  mqtt_subscribe();   
}

/*================= LOOP ======================*/

void loop () {
mqtt_subscribe();
  
int32_t period = 600000; // Publication period

if(isPublishing){
  if ( millis() - tick > period)
  {
    createJsonTemp();
    client.publish(TOPIC_TEMP, jpayload);
    Serial.println(jpayload);// publish it 
    tick = millis();
  }
}
//   Process MQTT ... obligatoire une fois par loop()
  client.loop(); 
}
