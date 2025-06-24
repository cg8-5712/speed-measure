#define SENSOR_PIN 14  // D5 = GPIO14

bool isBlocking = false;
unsigned long blockStartTime = 0;

void setup() {
  Serial.begin(115200);
  pinMode(SENSOR_PIN, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);  // 熄灭LED
}

void loop() {
  int val = digitalRead(SENSOR_PIN);

  if (val == HIGH && !isBlocking) {
    // 遮挡刚刚开始
    isBlocking = true;
    blockStartTime = micros();
    digitalWrite(LED_BUILTIN, LOW);  // 点亮LED
  }

  else if (val == LOW && isBlocking) {
    // 遮挡刚刚结束
    isBlocking = false;
    unsigned long blockDuration = micros() - blockStartTime;
    float blockMs = blockDuration / 1000.0;  // 转为毫秒，保留3位
    Serial.print("遮挡时间：");
    Serial.print(blockMs, 3);
    Serial.println(" ms");
    digitalWrite(LED_BUILTIN, HIGH);  // 熄灭LED
  }

  // 为避免过度轮询，略加延时
  delayMicroseconds(200);  // 检测频率约 5kHz
}
