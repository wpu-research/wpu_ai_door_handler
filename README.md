# Interactive Avatar with Face Recognition

A React-based interactive avatar system with voice interaction, face recognition, and IoT capabilities. This application combines several advanced technologies to create a virtual assistant that can respond to voice commands, recognize faces, and control physical devices through an Arduino connection.

## Features

- **Interactive 3D Avatar**: Animated 3D avatar with speech synthesis using HeyGen API
- **Face Recognition**: User identification and authorization using facial recognition
- **Speech Recognition**: Multiple voice recognition options including Google Speech API
- **Natural Language Understanding**: Context-aware responses for university-related queries
- **IoT Control**: Door control through Arduino serial connection
- **Multi-modal Interface**: Voice, text, and touch interaction methods

## Tech Stack

- **Frontend**: React, TypeScript, NextUI components
- **Avatar**: HeyGen Streaming Avatar API
- **Face Recognition**: @vladmandic/face-api (secure fork of face-api.js)
- **Speech Recognition**: Web Speech API (Google implementation)
- **IoT Communication**: Web Serial API for Arduino communication

## Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/interactive-avatar.git
   cd interactive-avatar
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up face recognition models
   ```bash
   npm run setup-face-models
   ```

4. Create the necessary directories for face images
   ```bash
   mkdir -p public/members/{ahmet,mehmet,ayse,fatma,murat}
   ```

5. Start the development server
   ```bash
   npm run dev
   ```

## Project Structure

```
/components
  /InteractiveAvatar
    - index.tsx                    # Main component that integrates all modules
    - types.ts                     # Type definitions
    - useFaceRecognition.tsx       # Face recognition hook
    - useArduinoConnection.tsx     # Arduino connection hook
    - useSpeechRecognition.tsx     # Google Speech recognition hook
    - useConversationEngine.tsx    # Conversation logic and responses
    - useDoorControl.tsx           # Door control with authorization
    - AvatarControls.tsx           # UI components for avatar controls
    - FaceRecognitionModal.tsx     # Modal component for face recognition
```

## Configuration

### Face Recognition

1. Add sample photos to the member directories:
   - At least 2 photos per person in their respective folder
   - For example: `/public/members/ahmet/1.jpg` and `/public/members/ahmet/2.jpg`

2. Ensure the face-api models are downloaded to `/public/models/`

### Arduino Setup

1. The system is configured to work with Arduino devices using a basic serial protocol
2. Upload the following sketch to your Arduino:

```cpp
void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  if (Serial.available() > 0) {
    char command = Serial.read();
    
    if (command == 'H') {
      digitalWrite(LED_BUILTIN, HIGH); // "Open door"
      Serial.println("Door opened");
    } 
    else if (command == 'L') {
      digitalWrite(LED_BUILTIN, LOW);  // "Close door"
      Serial.println("Door closed");
    }
    else if (command == 'T') {
      // Test command
      Serial.println("Test command received");
    }
  }
}
```

## Usage

1. Start the application
2. Connect to Arduino using the "Arduino'ya Bağlan" button
3. Select an avatar and language
4. Start the session
5. Use the "Yüz Tanıma" button to authenticate with face recognition
6. Interact with the avatar using one of three modes:
   - Text mode: Type and send messages
   - Voice mode: Use built-in voice recognition
   - Google Speech: Use Google's speech recognition API (more accurate for Turkish)

### Voice Commands

The assistant can respond to various queries about Dünya Barış Üniversitesi:
- General info: "Sen kimsin?"
- University vision/mission: "Üniversitenin vizyonu nedir?"
- Faculties: "Hangi fakülteler var?"
- Scholarships: "Burs imkanları nedir?"
- Daily info: "Bugün neler var?", "Öğle yemeğinde ne var?"

### Door Control

Only authorized users (currently "ahmet" and "murat") can open the door:
- "Kapıyı aç" - Opens the door if user is authorized
- "Kapıyı kapat" - Closes the door (no authorization required)

## Security Features

- Face recognition based authentication
- Role-based access control for door operations
- Session-based authorization storage

## Development Notes

- For production use, replace mock face detection with actual face processing
- The conversation engine can be expanded with additional patterns and responses
- The Arduino connection supports any serial-based protocol

## Dependencies

- @heygen/streaming-avatar
- @nextui-org/react
- @vladmandic/face-api
- ahooks
- react & react-dom

## License

World Peace University - https://wpu.edu.tr