#include <ESP8266WiFi.h>
#include <WiFiUdp.h>

// WiFi credentials
const char* ssid = "YourSSID";
const char* password = "YourPassword";

// UDP config
const char* udpServerIP = "your_server_ip";
const int udpPort = 8888;

WiFiUDP udp;

// 光电传感器引脚
#define SENSOR_PIN 14  // D5 = GPIO14

// 状态管理
bool isBlocking = false;
unsigned long blockStartTime = 0;

// UDP 发送控制
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 50;  // 每 50ms 发送一次基本信息

void setup() {
  Serial.begin(115200);
  pinMode(SENSOR_PIN, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);  // 熄灭LED

  delay(500);
  Serial.println("[INFO] Starting ESP8266...");

  // WiFi连接
  WiFi.begin(ssid, password);
  Serial.print("[INFO] Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[INFO] WiFi is connected.");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[ERROR] WiFi not connected.");
    return;
  }

  // 启动 UDP
  if (!udp.begin(udpPort)) {
    Serial.println("[ERROR] Failed to start UDP.");
  } else {
    Serial.println("[INFO] UDP socket started.");
  }
}

void loop() {
  // --- 光电传感器遮挡检测逻辑 ---
  int val = digitalRead(SENSOR_PIN);

  if (val == HIGH && !isBlocking) {
    // 遮挡开始
    isBlocking = true;
    blockStartTime = micros();
    digitalWrite(LED_BUILTIN, LOW);  // 点亮LED
  } else if (val == LOW && isBlocking) {
    // 遮挡结束
    isBlocking = false;
    unsigned long blockDuration = micros() - blockStartTime;
    float blockMs = blockDuration / 1000.0;

    // 串口输出遮挡信息
    Serial.print("遮挡时间：");
    Serial.print(blockMs, 3);
    Serial.println(" ms");

    // 通过 UDP 发送遮挡信息
    String message = "遮挡时间: " + String(blockMs, 3) + " ms";
    sendUDP(message);

    digitalWrite(LED_BUILTIN, HIGH);  // 熄灭LED
  }

  // --- 定时发送常规 UDP 心跳包 ---
  if (WiFi.status() == WL_CONNECTED) {
    unsigned long currentTime = millis();
    if (currentTime - lastSendTime >= sendInterval) {
      String message = "Time: " + String(currentTime) + " ms";
      sendUDP(message);
      lastSendTime = currentTime;
    }
  } else {
    Serial.println("[WARNING] WiFi disconnected.");
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));  // 快速闪烁
    delay(300);
  }

  // 传感器检测节流（提升响应）
  delayMicroseconds(200);
}

// ---------- 封装 UDP 发送函数 ----------
void sendUDP(const String& msg) {
  if (udp.beginPacket(udpServerIP, udpPort) != 1) {
    Serial.println("[ERROR] beginPacket() failed.");
    return;
  }

  int bytesWritten = udp.write(msg.c_str());
  if (bytesWritten != msg.length()) {
    Serial.printf("[WARNING] Wrote %d/%d bytes\n", bytesWritten, msg.length());
  }

  if (udp.endPacket() != 1) {
    Serial.println("[ERROR] endPacket() failed.");
  } else {
    Serial.println("[INFO] UDP packet sent: " + msg);
  }
}
