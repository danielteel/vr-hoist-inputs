#include <Arduino.h>
#include <WiFi.h>
#include "heltec.h"


WiFiClient client;

byte lastHoistSpeed = 15;
byte lastPowerState = 1;
byte lastCutState = 0;

float extendMax = 4095;
float extendMin = 0;

const int THUMBWHEEL_PIN = 35;
const int POWERSWITCH_PIN = 19;
const int POWERLED_PIN = 22;
const int CUTSWITCH_PIN = 23;

void showString(String str, const uint8_t *fontData = ArialMT_Plain_10){
    Heltec.display->setFont(fontData);
    Heltec.display->clear();
    Heltec.display->drawString(0, 0, str);
    Heltec.display->display();
}
  
void setup() {

    //Setup pin modes
    adcAttachPin(THUMBWHEEL_PIN);
    pinMode(POWERSWITCH_PIN, INPUT_PULLUP);
    pinMode(POWERLED_PIN, OUTPUT);
    pinMode(CUTSWITCH_PIN, INPUT_PULLUP);

    //Board specific setup
    Heltec.begin(true, false, true);//enable display and serial connection
    Heltec.display->flipScreenVertically();

    //Connect to wifi
    showString("Connecting to WiFi");
    WiFi.begin("Ol Dusty", "powerboner69");
    while(WiFi.status() != WL_CONNECTED) {
      delay(500);
    }

    

    showString("Do max down", ArialMT_Plain_16);
    delay(2000);
    extendMax = (analogRead(THUMBWHEEL_PIN)+analogRead(THUMBWHEEL_PIN)+analogRead(THUMBWHEEL_PIN))/3;
    
    
    showString("Do max up", ArialMT_Plain_16);
    delay(2000);
    extendMin = (analogRead(THUMBWHEEL_PIN)+analogRead(THUMBWHEEL_PIN)+analogRead(THUMBWHEEL_PIN))/3;

}

byte readHoist(){
  float raw = (analogRead(THUMBWHEEL_PIN)+analogRead(THUMBWHEEL_PIN)+analogRead(THUMBWHEEL_PIN))/3;
  if (extendMax>extendMin){
    if (raw>extendMax) raw=extendMax;
    if (raw<extendMin) raw=extendMin;
  }else{
    if (raw<extendMax) raw=extendMax;
    if (raw>extendMin) raw=extendMin;
  }
  raw=raw-extendMin;
  raw=raw/(extendMax-extendMin);
  raw=raw*31;
  if (raw<0) raw=0;
  if (raw>31) raw=31;
  return raw;
}

bool readPowerState(){
  return !digitalRead(POWERSWITCH_PIN);
}
bool readHoistCutState(){
  return !digitalRead(CUTSWITCH_PIN);
}

void loop() {
    if (!client.connect("192.168.1.5", 3001)){
        delay(150);
    }else{
        //store initial state
        lastHoistSpeed = readHoist();
        lastCutState = readHoistCutState();
        lastPowerState = readPowerState();
        
        //send initial state
        client.setNoDelay(true);
        client.write(lastHoistSpeed);
        client.write(32+lastPowerState);
        client.write(34+lastCutState);
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

          bool cutState = readHoistCutState();
          if (cutState != lastCutState){
            delay(50);//debounce
            lastCutState = cutState;
            client.write(34+cutState);
            client.flush();
          }

          digitalWrite(POWERLED_PIN, powerState);
    
          Heltec.display->clear();
          Heltec.display->setTextAlignment(TEXT_ALIGN_LEFT);
          Heltec.display->setFont(ArialMT_Plain_10);
          Heltec.display->drawString(0, 0, "Hoist: "+String(hoistSpeed));
          
          Heltec.display->drawProgressBar(60, 0, 60, 10, float(float(hoistSpeed)/32.0f)*100.0f);
          
          Heltec.display->drawString(0, 15, "Power "+String(powerState?"on":"off"));
          Heltec.display->drawString(0, 30, "Cut "+String(cutState?"on":"off"));
          Heltec.display->drawString(0, 45, "Connected");
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
    Heltec.display->drawString(0, 30, "Cut "+String(readHoistCutState()?"on":"off"));
    Heltec.display->drawString(0, 45, "Not connected");
    digitalWrite(POWERLED_PIN, readPowerState());
    Heltec.display->display();
}
