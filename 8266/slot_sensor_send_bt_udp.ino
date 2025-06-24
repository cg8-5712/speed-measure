#include <ESP8266WiFi.h>
#include <WiFiUdp.h>

extern "C" {
  #include "user_interface.h"  // 用于设置 WiFi 轻睡眠
}

// --- WiFi 配置 ---
const char* ssid = "YourSSID";
const char* password = "YourPassword";

// --- UDP 配置 ---
const char* udpServerIP = "yourServerIP";
const int udpPort = 8888;

WiFiUDP udp;

// --- 传感器配置 ---
#define SENSOR_PIN 14  // D5 = GPIO14

// --- 状态变量 ---
bool isBlocking = false;
unsigned long blockStartTime = 0;
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 200;  // 心跳每200ms发送一次

void setup() {
  Serial.begin(115200);
  pinMode(SENSOR_PIN, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);  // 熄灭LED（低电平点亮）

  delay(200);

  Serial.println("[INFO] Booting...");
  WiFi.begin(ssid, password);
  Serial.print("[INFO] Connecting to WiFi");

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] WiFi not connected.");
    return;
  }

  Serial.println("[INFO] WiFi connected.");
  Serial.print("IP: "); Serial.println(WiFi.localIP());

  // 开启轻休眠
  wifi_set_sleep_type(LIGHT_SLEEP_T);

  if (!udp.begin(udpPort)) {
    Serial.println("[ERROR] UDP start failed.");
  } else {
    Serial.println("[INFO] UDP socket ready.");
  }
}

void loop() {
  int val = digitalRead(SENSOR_PIN);

  // --- 遮挡检测 ---
  if (val == HIGH && !isBlocking) {
    isBlocking = true;
    blockStartTime = micros();
    digitalWrite(LED_BUILTIN, LOW);  // 点亮LED（遮挡时）
  } else if (val == LOW && isBlocking) {
    isBlocking = false;
    unsigned long blockDuration = micros() - blockStartTime;
    float blockMs = blockDuration / 1000.0;

    Serial.print("[EVENT] 遮挡时间：");
    Serial.print(blockMs, 3);
    Serial.println(" ms");

    digitalWrite(LED_BUILTIN, HIGH);  // 熄灭LED

    String msg = "遮挡时间: " + String(blockMs, 3) + " ms";
    sendUDP(msg);
  }

  // --- 心跳 UDP 发送 ---
  if (WiFi.status() == WL_CONNECTED) {
    unsigned long now = millis();
    if (now - lastSendTime >= sendInterval) {
      String heartbeat = "Time: " + String(now) + " ms";
      sendUDP(heartbeat);
      lastSendTime = now;
    }
  } else {
    Serial.println("[WARN] WiFi lost.");
    delay(300);
  }

  // --- 低功耗延时控制 ---
  if (!isBlocking) {
    delay(5);  // 小延迟降低 CPU 活跃度
  } else {
    delayMicroseconds(200);  // 遮挡期间高频轮询
  }
}

// --- UDP发送封装 ---
void sendUDP(const String& msg) {
  if (udp.beginPacket(udpServerIP, udpPort)) {
    udp.write(msg.c_str());
    if (udp.endPacket() == 1) {
      Serial.println("[UDP] Sent: " + msg);
    } else {
      Serial.println("[UDP ERROR] endPacket() failed.");
    }
  } else {
    Serial.println("[UDP ERROR] beginPacket() failed.");
  }
}
