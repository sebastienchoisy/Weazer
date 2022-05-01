/*
 * Auteur : G.Menez
 */

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
/* ---- Light       ----*/
const int LightPin = A5; // Read analog input on ADC1_CHANNEL_5 (GPIO 33)
/* ---- Temperature ----*/
OneWire oneWire(23); // Pour utiliser une entite oneWire sur le port 23
DallasTemperature TempSensor(&oneWire) ; // Cette entite est utilisee par le capteur de temperature


String whoami; // Identification de CET ESP au sein de la flotte
HTTPClient http;
/*===== MQTT broker/server and TOPICS ========*/
String MQTT_SERVER = "test.mosquitto.org";

int MQTT_PORT =  8883; // for TLS cf https://test.mosquitto.org/

//==== MQTT Credentials =========

char *mqtt_id     = "seb";
char *mqtt_login  = NULL;
char *mqtt_passwd = NULL;


//==== MQTT TOPICS ==============
#define TOPIC_TEMP "iot/M1Miage2022/temp"

const char* CA_cert = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIEAzCCAuugAwIBAgIUBY1hlCGvdj4NhBXkZ/uLUZNILAwwDQYJKoZIhvcNAQEL\n" \
"BQAwgZAxCzAJBgNVBAYTAkdCMRcwFQYDVQQIDA5Vbml0ZWQgS2luZ2RvbTEOMAwG\n" \
"A1UEBwwFRGVyYnkxEjAQBgNVBAoMCU1vc3F1aXR0bzELMAkGA1UECwwCQ0ExFjAU\n" \
"BgNVBAMMDW1vc3F1aXR0by5vcmcxHzAdBgkqhkiG9w0BCQEWEHJvZ2VyQGF0Y2hv\n" \
"by5vcmcwHhcNMjAwNjA5MTEwNjM5WhcNMzAwNjA3MTEwNjM5WjCBkDELMAkGA1UE\n" \
"BhMCR0IxFzAVBgNVBAgMDlVuaXRlZCBLaW5nZG9tMQ4wDAYDVQQHDAVEZXJieTES\n" \
"MBAGA1UECgwJTW9zcXVpdHRvMQswCQYDVQQLDAJDQTEWMBQGA1UEAwwNbW9zcXVp\n" \
"dHRvLm9yZzEfMB0GCSqGSIb3DQEJARYQcm9nZXJAYXRjaG9vLm9yZzCCASIwDQYJ\n" \
"KoZIhvcNAQEBBQADggEPADCCAQoCggEBAME0HKmIzfTOwkKLT3THHe+ObdizamPg\n" \
"UZmD64Tf3zJdNeYGYn4CEXbyP6fy3tWc8S2boW6dzrH8SdFf9uo320GJA9B7U1FW\n" \
"Te3xda/Lm3JFfaHjkWw7jBwcauQZjpGINHapHRlpiCZsquAthOgxW9SgDgYlGzEA\n" \
"s06pkEFiMw+qDfLo/sxFKB6vQlFekMeCymjLCbNwPJyqyhFmPWwio/PDMruBTzPH\n" \
"3cioBnrJWKXc3OjXdLGFJOfj7pP0j/dr2LH72eSvv3PQQFl90CZPFhrCUcRHSSxo\n" \
"E6yjGOdnz7f6PveLIB574kQORwt8ePn0yidrTC1ictikED3nHYhMUOUCAwEAAaNT\n" \
"MFEwHQYDVR0OBBYEFPVV6xBUFPiGKDyo5V3+Hbh4N9YSMB8GA1UdIwQYMBaAFPVV\n" \
"6xBUFPiGKDyo5V3+Hbh4N9YSMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQEL\n" \
"BQADggEBAGa9kS21N70ThM6/Hj9D7mbVxKLBjVWe2TPsGfbl3rEDfZ+OKRZ2j6AC\n" \
"6r7jb4TZO3dzF2p6dgbrlU71Y/4K0TdzIjRj3cQ3KSm41JvUQ0hZ/c04iGDg/xWf\n" \
"+pp58nfPAYwuerruPNWmlStWAXf0UTqRtg4hQDWBuUFDJTuWuuBvEXudz74eh/wK\n" \
"sMwfu1HFvjy5Z0iMDU8PUDepjVolOCue9ashlS4EB5IECdSR2TItnAIiIwimx839\n" \
"LdUdRudafMu5T5Xma182OC0/u/xRlEm+tvKGGmfFcN0piqVl8OrSPBgIlb+1IKJE\n" \
"m/XriWr/Cq4h/JfB7NTsezVslgkBaoU=\n" \
"-----END CERTIFICATE-----";


const char* ESP_cert = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIDcjCCAlqgAwIBAgIBADANBgkqhkiG9w0BAQsFADCBkDELMAkGA1UEBhMCR0Ix\n" \
"FzAVBgNVBAgMDlVuaXRlZCBLaW5nZG9tMQ4wDAYDVQQHDAVEZXJieTESMBAGA1UE\n" \
"CgwJTW9zcXVpdHRvMQswCQYDVQQLDAJDQTEWMBQGA1UEAwwNbW9zcXVpdHRvLm9y\n" \
"ZzEfMB0GCSqGSIb3DQEJARYQcm9nZXJAYXRjaG9vLm9yZzAeFw0yMjA0MDExNzUy\n" \
"MDJaFw0yMjA2MzAxNzUyMDJaMEwxCzAJBgNVBAYTAkZSMQ0wCwYDVQQIDARQQUNB\n" \
"MQ0wCwYDVQQHDAROaWNlMQ4wDAYDVQQKDAVNSUFHRTEPMA0GA1UEAwwGZXNwU2Vi\n" \
"MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6Tzb/mnHwQ3kkWCMCGHP\n" \
"ZK4G7b5VzcV04Gdt6qAiHMgmzb65sXW9aV3H0MEr/B0Bp/8/Dsy4f34YcTf51uYR\n" \
"tcltuqS4VuWhXpB/ZL5FALCLSXKWL4yjhnqAGQ98VoWASwfiOCdq1DJ0JV4YgM7a\n" \
"eJbvCNe9LqSojcC7B6lstmeK/w3zcogURkPz2NLKDrT/B7/c282ravQ7qPAPGd3d\n" \
"lA8h8/Ql0+qsVmWR2WmPnBh9C8coVFSg4n78lnWoP+VJuatFzO1pKXAMdE0x24cb\n" \
"JzcKxoTTdLpZk/7sd5CdW0b2+zbw+IEeoUiy+erKQareYRkphnLga5aduKIsSAXY\n" \
"xQIDAQABoxowGDAJBgNVHRMEAjAAMAsGA1UdDwQEAwIF4DANBgkqhkiG9w0BAQsF\n" \
"AAOCAQEALDdp+vsNRFX+8NDfQA+4yXiuGREgroQx1u+t0nYDoYiGPoGbhxIFi//I\n" \
"vI8n3lIj0aCOBVcAAYvuHaHXIzlaJU5okbHIujhmEesoxJmeQk8CLrorTYqfO3j3\n" \
"Rm4OKZJ1UaVQOkAdEEboSW/xCrMbGnoWEg7mANmTm6Xl+d8ibFL1ppa8f/GJp6cJ\n" \
"kCaKrDTTc6PcYLbTqsRnPZ2CYrNNXbkhqRzA/eUgIhMtFPxGaWcWd3TK1Pg6zwbV\n" \
"jBmOJd4Rep1zFSZlwMCRW9pUHL4cJsHzH7haf08MMAXJJ6G6J35TdESCpBbk/OSt\n" \
"tdtISK+YtYUAVHstKiKQ6pceGSz+kw==\n" \
"-----END CERTIFICATE-----";

const char* ESP_key= \
"-----BEGIN RSA PRIVATE KEY-----\n" \
"MIIEowIBAAKCAQEA6Tzb/mnHwQ3kkWCMCGHPZK4G7b5VzcV04Gdt6qAiHMgmzb65\n" \
"sXW9aV3H0MEr/B0Bp/8/Dsy4f34YcTf51uYRtcltuqS4VuWhXpB/ZL5FALCLSXKW\n" \
"L4yjhnqAGQ98VoWASwfiOCdq1DJ0JV4YgM7aeJbvCNe9LqSojcC7B6lstmeK/w3z\n" \
"cogURkPz2NLKDrT/B7/c282ravQ7qPAPGd3dlA8h8/Ql0+qsVmWR2WmPnBh9C8co\n" \
"VFSg4n78lnWoP+VJuatFzO1pKXAMdE0x24cbJzcKxoTTdLpZk/7sd5CdW0b2+zbw\n" \
"+IEeoUiy+erKQareYRkphnLga5aduKIsSAXYxQIDAQABAoIBAQDZtPIQHsLS49nn\n" \
"DPyI0muYqYxUHCbRRK9cy45gxAozXWxC/fUsvR8JG/1oUPdyg8zI+Eru0I6iipvc\n" \
"CojNW8FKMvOWlSxwCDXBJBWVfri/9Qp+i1O+nIMDApNRURAZXtGqt3gkPD7ORS3+\n" \
"tz8d9HceupvyYBX5VL70WeL6Ot37vxA3fjW8htydfdnPBSX23Ef3+H91ws0HqFaX\n" \
"ZRbWvn7kmkrE/oWBnl4SkQLVP8w54BQzy1pQm5E1N/bXIjJ7JUXzOXIca7R0vJ9D\n" \
"EzM06hN19d5bEyMCh02+pv73fiwfnci+KajZG3xi/4iJ4eHQLnQllMUCVgKc2olR\n" \
"sdvrENIdAoGBAPtW5wgN80uFMXXMCFxjLQaqaJcu0897usYnvLIlIcL0f5+H7SK6\n" \
"8EEOxqmPShMNE2RE8IG1ISAM2s0C2VE2+0Rz3EBgzG+KEKa0bSBS8iVxe0P1DPHA\n" \
"J0NY0HhV972aGZ24NaYM9qLH1Sk+nBKMBC9FLRMi5YfqqFjmAuS0KRvXAoGBAO2Q\n" \
"B1xONezwau8N2HKd0yBs1vNCE7juMYTwhfNAYgoDYH23jezr5CCtOoYNn8aBoq5o\n" \
"GohslOozn8IN7frNrKUoN0bqd1JZEz3TyOzRv6gCc/nNcuJ0syiNekjmUF+BqOrh\n" \
"3VP26w0nYtvv6u5a6OqTYABQNr6dV1D4bFfbYvzDAoGADlvIlw00+PuC99fQIncH\n" \
"+3mAwCJMt226HdfnT8YPR7PwFo0NXw6O6yiM8OLeuHfmw7OsibxvSAVz+oJPJ/Sc\n" \
"Jiz4SDU/eJ/Kk7t7AH28l6cEA73cH3N6yr4oKre+j3ZeQERlzDaxYFtKMjEBeY3G\n" \
"L20kRhOYSUt+kpWRVL92GcECgYAZo3633pUBUl0oGaVvkUr05+o27L22Krbbcx3x\n" \
"x9QM4ppqVwIRPNAtGqUDTLsesGT/T6r1aEqWECZAykIR3FqypGl61Nk14Pkrpgy8\n" \
"SlLV7hXYMu0gNZoUWViGP50TAapaVzAM3Mw3ajXIKNeBC/yxPGCTCBUwc0i2K2l9\n" \
"/eZsAwKBgHeQ3ExlNSHS6k1T8MsrnxunZWDwi46lr3Ipfg7oWjplXgTLgkKqoXmZ\n" \
"V4kTGw3De/XZwTe2KWfyal/SBPyIPbYm8J1jSN6n/tsJO6QGcTEt+5/ZvKproWEY\n" \
"/M7obvfh2ri8kLjz8B4+UP9bXP9ZCY9C+auJlRCXEjkIigMEhS6T\n" \
"-----END RSA PRIVATE KEY-----";



WiFiClientSecure secureClient;     // Avec TLS !!!
PubSubClient client(secureClient); // MQTT client

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
  for(int i = 0 ; i < length ; i++) {
    messageTemp += (char) message[i];
  }
  Serial.println(messageTemp);
}


void createJsonTemp(){
  jdoc.clear();
  jdoc["status"]["temperature"]= get_temperature();
  jdoc["status"]["light"]= get_light();
  jdoc["status"]["loc"]["longitude"]= -122.4194;
  jdoc["status"]["loc"]["latitude"]= 37.7749;
  jdoc["info"]["user"]= "esp_Seb";
  jdoc["info"]["ident"] = whoami;
  serializeJson(jdoc, jpayload);
}

/*============= CONNECT and SUBSCRIBE =====================*/

void mqtt_connect() {
  /*
     Subscribe to a MQTT topic
  */
  // For TLS
  secureClient.setCACert(CA_cert);
  secureClient.setCertificate(ESP_cert);
  secureClient.setPrivateKey(ESP_key);


  while (!client.connected()) { // Loop until we're reconnected
    Serial.print("Attempting MQTT connection...");

    // Attempt to connect => https://pubsubclient.knolleary.net/api
    if (client.connect(mqtt_id,      /* Client Id when connecting to the server */
                       mqtt_login,   /* With credential */
                       mqtt_passwd)) {
      Serial.println("connected");
      client.subscribe(TOPIC_TEMP);
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

  // Init temperature sensor
  TempSensor.begin();

  setup_mqtt_server();
  mqtt_connect();
  mqtt_subscribe();
  // On publie une première fois avant de rentrer dans la loop (pour éviter d'attendre 10 min)
  createJsonTemp();
  client.publish(TOPIC_TEMP, jpayload);
  Serial.println(jpayload);// publish it
}

/*================= LOOP ======================*/

void loop () {
mqtt_subscribe();

int32_t period = 300000; // Publication period

  if ( millis() - tick > period)
  {
    createJsonTemp();
    client.publish(TOPIC_TEMP, jpayload);
    Serial.println(jpayload);// publish it
    tick = millis();
  }
//   Process MQTT ... obligatoire une fois par loop()
  client.loop();
}
