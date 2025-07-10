#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include <AsyncTCP.h>
#include "ESPAsyncWebServer.h"


//WiFi credentials
const char* ssid = "";
const char* password = "";

AsyncWebServer server(80);

//Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

String receivedUID ="";
bool uidReceived = false;


#define API_KEY ""
#define FIREBASE_PROJECT_ID ""

// counter for unique document IDs
int documentCounter = 0;

bool listDocuments(
  FirebaseData *fbdo,
  const char *projectId,
  const char *databaseId,
  const char *collectionId,
  size_t pageSize,
  const char *pageToken = "",
  const char *orderBy = "",
  const char *mask = "",
  bool showMissing = false
);


//Function to connect to Wi-Fi
void connectToWiFi() {
  Serial.begin(115200);
  delay(5000);
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
     yield();
    Serial.print(".");
    if (++retries > 40) {
      Serial.println("\nFailed to connect.");
      return;
    }
}
Serial.println("\nWiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  time_t now = time(nullptr);
  while (now < 100000) {
    Serial.print(".");
    delay(500);
    now = time(nullptr);
  }
  Serial.println("\nTime synced successfully!");
}

void SERVER(){
  server.on("/receive_uid", HTTP_POST, [](AsyncWebServerRequest *request) {
    Serial.println("Hit /receive_uid endpoint");
  
    if (request->hasParam("userId", true)) {
      receivedUID = request->getParam("userId", true)->value();
      uidReceived = true;  
  
      Serial.println("UID received (any): ");
      Serial.println(receivedUID);
  
      AsyncWebServerResponse *response = request->beginResponse(200, "application/json", "{\"status\": \"success\"}");
      response->addHeader("Access-Control-Allow-Origin", "*");
      request->send(response);
  
    } else {
      Serial.println("Missing userId parameter!");
  
      AsyncWebServerResponse *response = request->beginResponse(400, "application/json", 
        "{\"status\": \"error\", \"message\": \"userId missing\"}");
      response->addHeader("Access-Control-Allow-Origin", "*");
      request->send(response);
    }
    if (receivedUID.length() > 0) {
      String uidPath = receivedUID;
      uidPath.trim();  // removes any whitespace
     String documentPath = "users/";
      documentPath += uidPath;
      documentPath += "/carData";
    }
    
  });
  
server.begin();
}

//Function to initialize Firebase
void initFirebase() {
  config.api_key = API_KEY;
  config.database_url = "";
  config.token_status_callback = tokenStatusCallback;
  auth.user.email = "";
  auth.user.password = "";
  

  fbdo.setBSSLBufferSize(8192, 2048);   
  fbdo.setResponseSize(4096);           

  Serial.println("Starting Firebase...");
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);    
  }


String getISOTimeUTC() {
  time_t now = time(nullptr);              // Get current time
  struct tm* timeinfo = gmtime(&now);      // Convert to UTC
  char isoTime[25];
  strftime(isoTime, sizeof(isoTime), "%Y-%m-%dT%H:%M:%SZ", timeinfo);  // ISO 8601 UTC format
  return String(isoTime);
}


int getCarDocumentCount(String uid) {
 
  String collectionPath = "users/";
  collectionPath += uid;
  collectionPath += "/carData";
  Serial.println("Fetching document list from: " );
  Serial.println(collectionPath);

  if (receivedUID.length() > 0) {
    String uidPath = receivedUID;
    uidPath.trim();  // removes any whitespace
   String documentPath = "users/";
    documentPath += uidPath;
    documentPath += "/carData";
  }
  if (Firebase.Firestore.listDocuments(
    &fbdo,
    FIREBASE_PROJECT_ID,
    "(default)",  
    collectionPath.c_str(),
    100, "", "", "", false)
) {

    String payload = fbdo.payload();
    Serial.println("Firestore response:");
    Serial.println(payload);

    int count = 0;
    int pos = 0;

    // Manually count the occurrences of "documents" by counting occurrences of "name":
    while ((pos = payload.indexOf("\"name\"", pos)) != -1) {
      count++;
      pos += 6;  // move past "name"
    }

    Serial.print(" Document count: ");
    Serial.println(count);
    return count;
  } else {
    Serial.print("listDocuments failed: ");
    Serial.println(fbdo.errorReason());
  }

  return 0; 
}



// send car data to Firestore
void sendCarData(double speed, double longitude, double latitude, double direction, double acceleration,String scenarioType , String featuresWarning) {
  int carIndex = getCarDocumentCount(receivedUID);
  FirebaseJson content;
  String documentPath = "users/" ;
  documentPath += receivedUID;
  documentPath += "/carData/data_";
  documentPath += String(carIndex);

  if (receivedUID.length() > 0) {
    String uidPath = receivedUID;
    uidPath.trim();  // removes any whitespace
   String documentPath = "users/";
    documentPath += uidPath;
    documentPath += "/carData";
  }
// Set data fields
content.set("fields/speed/doubleValue", speed);
content.set("fields/latitude/doubleValue", latitude);
content.set("fields/longitude/doubleValue", longitude);
content.set("fields/direction/doubleValue", direction);
content.set("fields/acceleration/doubleValue", acceleration);
content.set("fields/scenarioType/stringValue", scenarioType); 
content.set("fields/featuresWarning/stringValue", featuresWarning); 
content.set("fields/timestamp/timestampValue", getISOTimeUTC()); // timestamp

Serial.print("Sending data to Firestore: ");
if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "(default)", documentPath.c_str(), content.raw())
) {
  Serial.println("Success!");
  Serial.println(fbdo.payload().c_str());
} else {
  Serial.print("Failed: ");
  Serial.println(fbdo.errorReason());
}
}

// get data
void getCarData(String targetUID) {
  if (receivedUID == "") {
    Serial.println("UID not set. Cannot fetch data.");
    return;
  }
  int CarIndex = getCarDocumentCount(targetUID);

  String documentPath = "users/" ;
  documentPath += targetUID;
  documentPath += "/carData/data_";
  documentPath += String(CarIndex-1);

  if (receivedUID.length() > 0) {
    String uidPath = receivedUID;
    uidPath.trim();  // removes any whitespace
   String documentPath = "users/";
    documentPath += uidPath;
    documentPath += "/carData";
  }

  Serial.println("Fetching data from: ");
  Serial.println(documentPath);

  if (Firebase.Firestore.getDocument(&fbdo, FIREBASE_PROJECT_ID, "(default)", documentPath.c_str())
) {
    Serial.println("Document retrieved:");
    Serial.println(fbdo.payload());

    FirebaseJsonData jsonData;

    FirebaseJson json;
    json.setJsonData(fbdo.payload());

    // Parse specific fields
    if (json.get(jsonData, "fields/speed/doubleValue")) {
      Serial.print("Speed: ");
      Serial.println(jsonData.doubleValue);
    }
    if (json.get(jsonData, "fields/acceleration/doubleValue")) {
      Serial.print("Acceleration: ");
      Serial.println(jsonData.doubleValue);
    }
    if (json.get(jsonData, "fields/direction/doubleValue")) {
      Serial.print("Direction: ");
      Serial.println(jsonData.doubleValue);
    }
    if (json.get(jsonData, "fields/latitude/doubleValue")) {
      Serial.print("Latitude: ");
      Serial.println(jsonData.doubleValue);
    }
    if (json.get(jsonData, "fields/longitude/doubleValue")) {
      Serial.print("Longitude: ");
      Serial.println(jsonData.doubleValue);
    }
    if (json.get(jsonData, "fields/scenarioType/stringValue")) {
      Serial.print("dataType: ");
      Serial.println(jsonData.stringValue);
    }
    if (json.get(jsonData, "fields/featuresWarning/stringValue")) {
      Serial.print("vehicleWarning: ");
      Serial.println(jsonData.stringValue);
    }
  } else {
    Serial.print("Failed to get document: ");
    Serial.println(fbdo.errorReason());
  }
}


// Step 8: Setup function
void setup() {
  connectToWiFi();
  delay(2000);
  SERVER();
  delay(2000);
  initFirebase();
  delay(2000);
}
void loop(){
  struct CarScenario {
    double speed;
    double latitude;
    double longitude;
    double acceleration;
    double direction;
    String scenarioType;
    String featuresWarning;
  };

  CarScenario scenarios[] = {
    {10, 28.0940659, 30.756129, 1, 180, "fcw same direction - front ","No warning"},
    {5,  28.0940659, 3075209,   1, 140, "fcw same direction - front ","slow your speed(approaching slower car ahead)"},

    {5,  28.0940659, 30.756129, 1, 180, "fcw same direction - behind ","raise your speed (Risk of rear collision)"},
    {10, 28.0940659, 3075209,   1, 140, "fcw same direction - behind ","slow your speed(approaching slower car ahead)"},

    {5,  28.0940659, 30.756129, 1, 90,  "Opposite , front-EEBL ","change your direction( Vehicle approaching from front rapidly)"},
    {10, 28.0940659, 3075209,   1, 270, "Opposite , front-EEBL ","change your direction ( Vehicle approaching from front rapidly)"},

    {5,  28.0940659, 30.756129, 1, 250, "EEBL:detected ","Nearby vehicle braking hard"},
    {10, 28.0940659, 3075209,  -3, 300, "EEBL:detected ","you are using the Braking sharply"},

    {20, 28.0940659, 30.756129, 1, 25,  "DNPW: Opposite, overtaking risk ","Unsafe to overtake (oncoming vehicle detected)"},
    {15, 28.0940659, 3075209,  -1, 100, "DNPW: Opposite, overtaking risk ","Approaching vehicle from front"}
  };


  unsigned long uidWaitStart = millis();
while (!uidReceived && millis() - uidWaitStart < 15000) {
    Serial.println("Waiting for UID...");
    vTaskDelay(pdMS_TO_TICKS(5000)); // yield time
}

unsigned long firebaseWaitStart = millis();
while (!Firebase.ready() && millis() - firebaseWaitStart < 10000) {
    Serial.print(".");
    vTaskDelay(pdMS_TO_TICKS(500)); // small delay to yield CPU
}
  
  if (Firebase.ready()) {
      Serial.println("firebase ready... sending data is on");
      
      // Loop through each scenario and send to Firestore
      for (int i = 0; i < sizeof(scenarios) / sizeof(scenarios[0]); i++) {
        sendCarData(
          scenarios[i].speed,
          scenarios[i].longitude,
          scenarios[i].latitude,
          scenarios[i].direction,
          scenarios[i].acceleration,
          scenarios[i].scenarioType,
          scenarios[i].featuresWarning
        );

        delay(3000); 

      
      //fetch data of any uid 
      getCarData("");
  
      delay(10000);
    
  } }else {
    Serial.println("Firebase not ready!");
    delay(100000);
  }
}