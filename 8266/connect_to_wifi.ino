#include <ESP8266WiFi.h>
#include <WiFiUdp.h>

// WiFi配置
const char* ssid = "CMCC-U7eR";
const char* password = "ppu4tf92";

void setup() {
    Serial.begin(115200);
    pinMode(LED_BUILTIN,OUTPUT);

    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi...");

    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }

    Serial.println("\nWiFi connected");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
}

void loop() {
    digitalWrite(LED_BUILTIN,HIGH);
    delay(200);
    digitalWrite(LED_BUILTIN,LOW);
    delay(200);
    digitalWrite(LED_BUILTIN,HIGH);
    delay(200);
    digitalWrite(LED_BUILTIN,LOW);
    delay(200);
    digitalWrite(LED_BUILTIN,HIGH);
    Serial.println(WiFi.localIP());
    delay(1000);
}