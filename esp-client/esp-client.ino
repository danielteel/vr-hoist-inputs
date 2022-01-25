#include <Arduino.h>
#include <WiFi.h>
#include "heltec.h"


WiFiClient client;

byte lastHoistSpeed = 15;
byte lastPowerState = 1;

float extendMax = 4095;
float extendMin = 0;

  
void setup() {
    Heltec.begin(true /*DisplayEnable Enable*/, false /*LoRa Disable*/, true /*Serial Enable*/);
  
    Heltec.display->flipScreenVertically();
    Heltec.display->setFont(ArialMT_Plain_10);
  
    WiFi.begin("Ol Dusty", "powerboner69");
  
    while(WiFi.status() != WL_CONNECTED) {
      delay(500);
    }

    
  adcAttachPin(35);
  
  pinMode(19, INPUT_PULLUP);
  pinMode(22, OUTPUT);

  Heltec.display->clear();
  Heltec.display->setTextAlignment(TEXT_ALIGN_LEFT);
  Heltec.display->setFont(ArialMT_Plain_16);
  Heltec.display->drawString(0, 0, "Do max down");
  Heltec.display->display();
  delay(2000);
  extendMax = (analogRead(35)+analogRead(35)+analogRead(35))/3;
  
  Heltec.display->clear();
  Heltec.display->setTextAlignment(TEXT_ALIGN_LEFT);
  Heltec.display->setFont(ArialMT_Plain_16);
  Heltec.display->drawString(0, 0, "Do max up");
  Heltec.display->display();
  delay(2000);
  extendMin = (analogRead(35)+analogRead(35)+analogRead(35))/3;

}

byte readHoist(){
  float raw = (analogRead(35)+analogRead(35)+analogRead(35))/3;
  if (raw>extendMax) raw=extendMax;
  if (raw<extendMin) raw=extendMin;
  raw=raw-extendMin;
  raw=raw/(extendMax-extendMin);
  raw=raw*31;
  return raw;
}

bool readPowerState(){
  return !digitalRead(19);
}

void loop() {
    if (!client.connect("192.168.1.5", 3001)){
        delay(250);
    }else{
        client.setNoDelay(true);

        client.write(32+readPowerState());
        client.write(readHoist());
        client.flush();
    
        while (client.connected()){
          byte hoistSpeed = readHoist();
          if (abs(lastHoistSpeed-hoistSpeed)>=2 || (hoistSpeed==31 && lastHoistSpeed!=31) || (hoistSpeed==0 && lastHoistSpeed!=0)){
            lastHoistSpeed = hoistSpeed;
            client.write(hoistSpeed);
            client.flush();
          }

          bool powerState = readPowerState();
          if (powerState!=lastPowerState){
            delay(50);//debounce a little
            lastPowerState=powerState;
            client.write(32+powerState);
            client.flush();
          }

          digitalWrite(22, powerState);
    
          Heltec.display->clear();
          Heltec.display->setTextAlignment(TEXT_ALIGN_LEFT);
          Heltec.display->setFont(ArialMT_Plain_10);
          Heltec.display->drawString(0, 0, "Hoist: "+String(hoistSpeed));
          
          Heltec.display->drawProgressBar(60, 0, 60, 10, float(float(hoistSpeed)/32.0f)*100.0f);
          
          Heltec.display->drawString(0, 15, "Power "+String(powerState?"on":"off"));
          Heltec.display->display();
          
        }
        client.stop();
    }
    byte hoistSpeed = readHoist();          
    Heltec.display->clear();
    Heltec.display->setTextAlignment(TEXT_ALIGN_LEFT);
    Heltec.display->setFont(ArialMT_Plain_10);
    Heltec.display->drawString(0, 0, "Hoist: "+String(hoistSpeed));
    
    Heltec.display->drawProgressBar(60, 0, 60, 10, float(float(hoistSpeed)/32.0f)*100.0f);
    
    Heltec.display->drawString(0, 15, "Power "+String(readPowerState()?"on":"off"));
    digitalWrite(22, readPowerState());
    Heltec.display->display();
}
