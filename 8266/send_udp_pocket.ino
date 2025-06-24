#include <WiFiUdp.h>
#include <ESP8266WiFi.h>

// WiFi credentials
const char* ssid = "YourSSID";
const char* password = "YourPassword";

// UDP Server Config
const char* udpServerIP = "YourServerIP";
const int udpPort = YourPortNumber;
WiFiUDP udp;

unsigned long lastSendTime = 0;
const unsigned long sendInterval = 50;  // Send interval in milliseconds (50ms)

void setup() {
    Serial.begin(115200);
    pinMode(LED_BUILTIN, OUTPUT);
    digitalWrite(LED_BUILTIN, HIGH); // LED off by default
    delay(500);  // Ensure serial ready

    Serial.println("[INFO] Starting ESP8266...");

    // Connect to WiFi
    WiFi.begin(ssid, password);
    Serial.print("[INFO] Connecting to WiFi");

    // Wait for connection (timeout after 10 seconds)
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    Serial.println();

    // Check WiFi connection status
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("not connected");
        return; // Exit setup
    }

    Serial.println("[INFO] WiFi is connected.");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());

    if (!udp.begin(udpPort)) {
        Serial.println("[ERROR] Failed to start UDP.");
    } else {
        Serial.println("[INFO] UDP socket started.");
    }
}

void loop() {
    if (WiFi.status() == WL_CONNECTED) {
        unsigned long currentTime = millis();
        if (currentTime - lastSendTime >= sendInterval) {
            digitalWrite(LED_BUILTIN, LOW); // LED on: sending
            String message = "Time: " + String(millis()) + "ms";
            Serial.print("[DEBUG] Sending message: ");
            Serial.println(message);

            if (udp.beginPacket(udpServerIP, udpPort) != 1) {
                Serial.println("[ERROR] beginPacket() failed.");
            }
            int bytesWritten = udp.write(message.c_str());
            if (bytesWritten != message.length()) {
                Serial.printf("[WARNING] Wrote %d/%d bytes\n", bytesWritten, message.length());
            }
            if (udp.endPacket() != 1) {
                Serial.println("[ERROR] endPacket() failed.");
            } else {
                Serial.println("[INFO] UDP packet sent.");
            }
            lastSendTime = currentTime;
            digitalWrite(LED_BUILTIN, HIGH); // LED off: done
        }
    } else {
        Serial.println("[WARNING] WiFi disconnected during runtime.");
        digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN)); // fast blink
        delay(300);
    }
}