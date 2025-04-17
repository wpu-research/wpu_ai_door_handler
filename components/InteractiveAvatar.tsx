import type { StartAvatarResponse } from "@heygen/streaming-avatar";

// Add Web Serial API type definitions
declare global {
  interface SerialPort {
    open(options?: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
    readable: ReadableStream;
    writable: WritableStream;
  }

  interface SerialPortRequestOptions {
    filters?: Array<{ usbVendorId?: number }>;
  }

  interface Serial {
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  }

  interface Navigator {
    serial: Serial;
  }
}

// Extend the StreamingEvents enum to include SPEECH_MARK
declare module "@heygen/streaming-avatar" {
  export enum StreamingEvents {
    SPEECH_MARK = "speechmark"
  }
}

import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
} from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Chip,
  Tabs,
  Tab,
  Textarea
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, usePrevious } from "ahooks";

import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";

import { AVATARS, STT_LANGUAGE_LIST } from "@/app/lib/constants";

// Create a conversation engine for natural responses
function createConversationEngine() {
  // Simple response mapping for common greetings and university questions
  const responses = {
    // Greeting patterns
    greetings: {
      patterns: ["merhaba", "selam", "günaydın", "iyi günler", "iyi akşamlar", "merhaba!"],
      responses: [
        "Merhaba! Size nasıl yardımcı olabilirim?",
        "Selam! Dünya Barış Üniversitesi Ada olarak hizmetinizdeyim.",
        "Merhaba! Üniversitemiz hakkında bilgi almak ister misiniz?"
      ]
    },
    
    // Identity questions
    identity: {
      patterns: ["sen kimsin", "kimsin sen", "kendini tanıt", "adın ne"],
      responses: [
        "Ben Dünya Barış Üniversitesi Ada, üniversitenizin sanal asistanıyım. Eğitim programları, burslar, başvuru süreçleri ve kampüs olanakları hakkında sorularınızı yanıtlayabilirim.",
        "Adım Ada, Dünya Barış Üniversitesi'nin sanal asistanıyım. Size üniversite hakkında her konuda yardımcı olabilirim."
      ]
    },
    
    // Vision and mission
    vision: {
      patterns: ["vizyon", "vizyonu", "üniversitenin vizyonu"],
      responses: [
        "Üniversitemizin vizyonu, öğrenci merkezli bir eğitim anlayışıyla, küresel barışa katkı sağlayacak liderler yetiştirmektir.",
        "Vizyonumuz, öğrenci odaklı eğitimle dünya barışına katkı sunacak liderler yetiştirmektir."
      ]
    },
    
    mission: {
      patterns: ["misyon", "misyonu", "üniversitenin misyonu"],
      responses: [
        "Misyonumuz, öğrencilere yenilikçi ve yaratıcı bilimsel araştırmalarla evrensel değerlere dayalı bir eğitim sunmayı, böylece hem KKTC'ye hem de dünyaya barış getirmeyi hedeflemektedir.",
        "Misyonumuz, evrensel değerlere dayalı yenilikçi eğitimle öğrencilerimize katkı sağlamak ve dünya barışına hizmet etmektir."
      ]
    },
    
    // Faculties
    faculties: {
      patterns: ["fakülte", "fakülteler", "hangi fakülteler", "bölümler"],
      responses: [
        "Üniversitemizde beş fakülte bulunmaktadır: İktisadi, İdari ve Sosyal Bilimler Fakültesi, Sanat Fakültesi, Mühendislik ve Mimarlık Fakültesi, Sağlık Bilimleri Fakültesi ve Hukuk Fakültesi.",
        "Dünya Barış Üniversitesi'nde İktisadi ve İdari Bilimler, Sanat, Mühendislik, Sağlık Bilimleri ve Hukuk olmak üzere beş fakülte bulunmaktadır."
      ]
    },
    
    // Scholarships
    scholarships: {
      patterns: ["burs", "burslar", "burs imkanları", "burs olanakları"],
      responses: [
        "Üniversitemiz, KKTC Öğrenci Yerleştirme ve Burs Sıralama Sınavı ile %100, %90 ve %75 oranlarında burslar sunmaktadır. Ayrıca, akademik başarı bursu da mevcuttur; en az iki dönem eğitim almış ve 3.00 genel not ortalamasına sahip öğrencilere verilmektedir.",
        "Burs olanaklarımız arasında %100, %90 ve %75 oranlarında KKTC sıralama bursu ve 3.00 ortalama üstü öğrencilere akademik başarı bursu bulunmaktadır."
      ]
    },
    
    // Daily conversations
    food: {
      patterns: ["yemek", "öğle yemeği", "akşam yemeği", "kahvaltı", "ne yiyebilirim"],
      responses: [
        "Kampüs çevresindeki kafeteryalarda taze salatalar, sandviçler ve sıcak yemekler mevcut. Ayrıca, kampüs içindeki kütüphanede sessiz bir ortamda çalışmak istersen, orada da rahatça vakit geçirebilirsin.",
        "Bugün yemekhanede tavuk sote ve mercimek çorbası var. Kampüs çevresinde birçok kafe ve restoran da bulabilirsiniz."
      ]
    },
    
    events: {
      patterns: ["etkinlik", "etkinlikler", "bugün ne var", "bu hafta neler var"],
      responses: [
        "Bugün akşam saat 18:00'de 'Kariyer Günleri' etkinliği düzenlenecek. İş dünyasından konukların katılacağı bu etkinlik, kariyerinle ilgili önemli bilgiler sunabilir.",
        "Bu hafta 'Sürdürülebilir Kültürel Miras Paneli' ve 'El Sanatları Sergisi' düzenlenecek. Etkinlikler, kültürel mirasın korunması ve sürdürülebilirlik konularında farkındalık yaratmayı amaçlıyor. Katılım ücretsizdir."
      ]
    },
    
    motivation: {
      patterns: ["motivasyon", "motive", "moral", "üzgünüm", "kötüyüm"],
      responses: [
        "Unutma, her zorluk seni daha güçlü kılar. Bugün yapacağın küçük bir adım, yarının büyük başarısının temellerini atabilir.",
        "İleriye doğru atacağın her adım, seni hedeflerine bir adım daha yaklaştırır. Kendine inanmaya devam et!"
      ]
    },
    
    // Door related commands
    door: {
      patterns: ["kapı", "kapıyı aç", "kapıyı kapat"],
      responses: [
        "Tamam, kapıyı açıyorum",
        "Kapı açılıyor",
        "Kapı kapatılıyor",
        "Tamam, kapıyı kapatıyorum"
      ]
    },
    
    // Fallback responses when no match is found
    fallback: [
      "Bu konu hakkında daha detaylı bilgi için üniversitemizin web sitesini ziyaret edebilirsiniz.",
      "Anlamadığım için üzgünüm. Üniversite hakkında başka bir sorunuz var mı?",
      "Bu konuda size nasıl yardımcı olabileceğimi düşünüyorum. Biraz daha açıklayabilir misiniz?",
      "Dünya Barış Üniversitesi hakkında başka sorularınız var mı?"
    ]
  };
  
  // Function to get the most appropriate response for a given input
  const getResponse = (input) => {
    const lowerInput = input.toLowerCase();
    
    // Check all categories for a match
    for (const category in responses) {
      if (category === 'fallback') continue;
      
      const categoryData = responses[category];
      if (!categoryData.patterns) continue;
      
      // Check if any pattern in this category matches the input
      for (const pattern of categoryData.patterns) {
        if (lowerInput.includes(pattern)) {
          // Return a random response from the matching category
          const randomIndex = Math.floor(Math.random() * categoryData.responses.length);
          return categoryData.responses[randomIndex];
        }
      }
    }
    
    // If no match found, return a random fallback response
    const randomIndex = Math.floor(Math.random() * responses.fallback.length);
    return responses.fallback[randomIndex];
  };
  
  return {
    getResponse
  };
}

export default function InteractiveAvatar() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>();
  const [knowledgeId, setKnowledgeId] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>("");
  const [language, setLanguage] = useState<string>("en");

  const [data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  // AI asistanın konuşmalarını tutacak state
  const [aiConversation, setAiConversation] = useState<string[]>([]);
  // Kullanıcı konuşmalarını tutacak state
  const [userConversation, setUserConversation] = useState<string[]>([]);
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const [chatMode, setChatMode] = useState("text_mode");
  const [isUserTalking, setIsUserTalking] = useState(false);
  // Arduino için seri bağlantı durumu
  const [serialConnected, setSerialConnected] = useState(false);
  const serialPort = useRef<any>(null);
  // Konuşma geçmişini görüntülemek için ref
  const conversationEndRef = useRef<HTMLDivElement>(null);
  // Conversation engine instance
  const conversationEngine = useRef(createConversationEngine());

  function baseApiUrl() {
    return process.env.NEXT_PUBLIC_BASE_API_URL;
  }

  // Konuşma ekranını aşağı kaydır
  const scrollToBottom = () => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  // Speech recognition setup using Web Speech API (Google's implementation)
  const [recognition, setRecognition] = useState<any>(null);
  
  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // @ts-ignore - TypeScript doesn't know about SpeechRecognition by default
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;  // Set to true for continuous listening
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'tr-TR'; // Turkish language
      
      // Add auto-restart feature after results are processed
      recognitionInstance.onend = () => {
        // Only restart if we're still in google_voice mode and not manually stopped
        if (chatMode === "google_voice" && isUserTalking) {
          recognitionInstance.start();
          console.log("Google Speech recognition restarted automatically");
        }
      };
      
      recognitionInstance.onresult = async (event: any) => {
        const last = event.results.length - 1;
        const recognizedText = event.results[last][0].transcript;
        
        console.log("Google Speech API - Kullanıcı konuşması:", recognizedText);
        setText(recognizedText);
        setUserConversation(prev => [...prev, recognizedText]);
        
        // Process recognized text through our conversation handler
        await processRecognizedText(recognizedText);
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setDebug(`Konuşma tanıma hatası: ${event.error}`);
      };
      
      setRecognition(recognitionInstance);
    } else {
      setDebug("Bu tarayıcı Web Speech API'yi desteklemiyor");
    }
    
    return () => {
      if (recognition) {
        recognition.abort();
      }
    };
  }, [chatMode]);

  // Arduino ile seri bağlantı kurma fonksiyonu
  async function connectToArduino() {
    try {
      // Tarayıcı Web Serial API'yi destekliyor mu?
      if ('serial' in navigator) {
        let port;
        
        try {
          // Kullanıcıdan bir port seçmesini iste
          setDebug("Lütfen açılan pencereden Arduino portunu seçin (/dev/ttyUSB0)");
          
          // Alttaki filtreler Arduino'ları seçmeye yardımcı olabilir
          const filters = [
            { usbVendorId: 0x2341 }, // Arduino
            { usbVendorId: 0x1a86 }  // Bazı CH340 çipleri (Arduino klonları)
          ];
          
          port = await navigator.serial.requestPort({ filters });
          setDebug("Port seçildi, bağlanılıyor...");
          
          await port.open({ baudRate: 9600 });
          
          // Yazma ve okuma stream'lerini oluştur
          const writer = port.writable.getWriter();
          
          // Okuma stream'i de oluşturalım ki Arduino'dan yanıt alabilelim
          const reader = port.readable.getReader();
          
          serialPort.current = { port, writer, reader };
          
          // Test amaçlı bir komut gönder
          setTimeout(async () => {
            // Arduino'nun hazır olması için biraz bekle ve test komutu gönder
            const testCmd = "T\n"; // Test komutu
            const encoder = new TextEncoder();
            await writer.write(encoder.encode(testCmd));
            setDebug("Arduino'ya test komutu gönderildi");
          }, 2000);
          
          setSerialConnected(true);
          setDebug("Arduino bağlantısı kuruldu");
          return true;
        } catch (err: any) {
          if (err.name === 'NotFoundError') {
            setDebug("Kullanıcı port seçmedi. Lütfen tekrar deneyin ve bir port seçin.");
          } else {
            console.error("Seri port hatası:", err);
            setDebug(`Seri port hatası: ${err.message}`);
          }
          return false;
        }
      } else {
        setDebug("Bu tarayıcı Web Serial API'yi desteklemiyor");
        return false;
      }
    } catch (error: any) {
      console.error("Arduino bağlantı hatası:", error);
      setDebug(`Arduino bağlantı hatası: ${error}`);
      return false;
    }
  }

  // Arduino'ya komut gönderme fonksiyonu
  async function sendCommandToArduino(command: string) {
    if (!serialPort.current) {
      setDebug("Arduino bağlantısı yok");
      return false;
    }
    
    try {
      const encoder = new TextEncoder();
      // Komutun sonuna satır sonu karakteri ekle (\n)
      const data = encoder.encode(command + "\n");
      await serialPort.current.writer.write(data);
      setDebug(`Arduino'ya komut gönderildi: ${command}`);
      
      // Komutun gönderildiğini doğrula
      console.log(`Komut gönderildi: ${command}`);
      return true;
    } catch (error: any) {
      console.error("Arduino'ya komut gönderme hatası:", error);
      setDebug(`Arduino'ya komut gönderme hatası: ${error}`);
      return false;
    }
  }

  // Kapı kontrol fonksiyonları
  async function openDoor() {
    const success = await sendCommandToArduino("H");
    if (success) {
      setDebug("Kapı açıldı");
      const responseText = "Tamam, kapıyı açıyorum";
      // AI cevabını konuşma geçmişine ekle
      setAiConversation(prev => [...prev, responseText]);
      await avatar.current?.speak({ 
        text: responseText, 
        taskType: TaskType.REPEAT, 
        taskMode: TaskMode.SYNC 
      });
    }
  }

  async function closeDoor() {
    const success = await sendCommandToArduino("L");
    if (success) {
      setDebug("Kapı kapatıldı");
      const responseText = "Tamam, kapıyı kapatıyorum";
      // AI cevabını konuşma geçmişine ekle
      setAiConversation(prev => [...prev, responseText]);
      await avatar.current?.speak({ 
        text: responseText, 
        taskType: TaskType.REPEAT, 
        taskMode: TaskMode.SYNC 
      });
    }
  }

  // Metin içinde kapı komutlarını kontrol etme
  function checkDoorCommands(inputText: string) {
    const lowerText = inputText.toLowerCase();
    
    if (lowerText.includes("kapı") && 
        (lowerText.includes("aç") || lowerText.includes("açık")) ||
        lowerText.includes("kapiyi ac")) {
      openDoor();
      return true;
    } 
    else if (lowerText.includes("kapı") && 
            (lowerText.includes("kapa") || lowerText.includes("kapalı") || lowerText.includes("kapat"))) {
      closeDoor();
      return true;
    }
    return false;
  }

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();

      console.log("Access Token:", token); // Log the token to verify

      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
    }

    return "";
  }
  
  // Add a function to start listening with Google's Speech Recognition
  function startGoogleSpeechRecognition() {
    if (recognition) {
      try {
        recognition.start();
        setIsUserTalking(true);
        setDebug("Google konuşma tanıma başlatıldı, lütfen konuşun...");
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
        setDebug("Konuşma tanıma başlatılamadı");
      }
    } else {
      setDebug("Konuşma tanıma hazır değil");
    }
  }
  
  // Function to stop listening
  function stopGoogleSpeechRecognition() {
    if (recognition) {
      recognition.stop();
      setIsUserTalking(false);
      setDebug("Konuşma tanıma durduruldu");
    }
  }
  
  // Process recognized text with the conversation engine
  async function processRecognizedText(recognizedText: string) {
    // First check for door commands
    const lowerText = recognizedText.toLowerCase();
    
    if (lowerText.includes("kapı") && 
        (lowerText.includes("aç") || lowerText.includes("açık")) ||
        lowerText.includes("kapiyi ac")) {
      // Send H command to Arduino to open the door
      await sendCommandToArduino("H");
      setDebug("Kapı açılıyor - 'kapıyı aç' komutu algılandı");
      
      // Avatar response
      const responseText = "Tamam, kapıyı açıyorum";
      setAiConversation(prev => [...prev, responseText]);
      if (avatar.current) {
        await avatar.current.speak({ 
          text: responseText, 
          taskType: TaskType.REPEAT, 
          taskMode: TaskMode.SYNC 
        });
      }
      return;
    } 
    
    if (lowerText.includes("kapı") && 
        (lowerText.includes("kapa") || lowerText.includes("kapat") || lowerText.includes("kapalı"))) {
      // Send L command to Arduino to close the door
      await sendCommandToArduino("L");
      setDebug("Kapı kapatılıyor - 'kapıyı kapat' komutu algılandı");
      
      // Avatar response
      const responseText = "Tamam, kapıyı kapatıyorum";
      setAiConversation(prev => [...prev, responseText]);
      if (avatar.current) {
        await avatar.current.speak({ 
          text: responseText, 
          taskType: TaskType.REPEAT, 
          taskMode: TaskMode.SYNC 
        });
      }
      return;
    }
    
    // Get a response from the conversation engine for other queries
    const responseText = conversationEngine.current.getResponse(recognizedText);
    setAiConversation(prev => [...prev, responseText]);
    if (avatar.current) {
      await avatar.current.speak({ 
        text: responseText, 
        taskType: TaskType.REPEAT, 
        taskMode: TaskMode.SYNC 
      });
    }
  }

  async function startSession() {
    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();

    avatar.current = new StreamingAvatar({
      token: newToken,
      basePath: baseApiUrl(),
    });
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("Avatar started talking", e);
    });
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e);
    });
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected");
      endSession();
    });
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log(">>>>> Stream ready:", event.detail);
      setStream(event.detail);
    });
    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      console.log(">>>>> User started talking:", event);
      setIsUserTalking(true);
    });
    avatar.current?.on(StreamingEvents.USER_STOP, async (event) => {
      console.log(">>>>> User stopped talking:", event);
      setIsUserTalking(false);
      
      // Kullanıcı konuşmayı bitirdiğinde metin kontrolü yap
      if (event.detail && event.detail.text) {
        const recognizedText = event.detail.text;
        setText(recognizedText);
        // Kullanıcı konuşmasını geçmişe ekle
        setUserConversation(prev => [...prev, recognizedText]);
        
        // Kullanıcı konuşmasını konsola yazdır
        console.log("Kullanıcı konuşması:", recognizedText);
        
        // Process recognized text through our conversation handler
        await processRecognizedText(recognizedText);
      }
    });
    
    // AI'ın konuşmasını yakalamak için speech event'ini ekleyelim
    avatar.current?.on(StreamingEvents.SPEECH_MARK, (event) => {
      if (event.detail && event.detail.type === 'sentence') {
        console.log("Speech mark:", event.detail);
      }
    });
    
    try {
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: avatarId,
        knowledgeId: knowledgeId, // Or use a custom `knowledgeBase`.
        voice: {
          rate: 1.5, // 0.5 ~ 1.5
          emotion: VoiceEmotion.EXCITED,
          // elevenlabsSettings: {
          //   stability: 1,
          //   similarity_boost: 1,
          //   style: 1,
          //   use_speaker_boost: false,
          // },
        },
        language: language,
        disableIdleTimeout: true,
      });

      setData(res);
      // default to voice mode
      // Removed the useSilencePrompt parameter as it wasn't in the type definition
      await avatar.current?.startVoiceChat();
      setChatMode("voice_mode");
      
      // Hoşgeldin mesajını göster
      const welcomeMessage = "Merhaba! Ben Dünya Barış Üniversitesi'nin sanal asistanı Ada. Size nasıl yardımcı olabilirim?";
      setAiConversation(prev => [...prev, welcomeMessage]);
      await avatar.current?.speak({ 
        text: welcomeMessage, 
        taskType: TaskType.REPEAT, 
        taskMode: TaskMode.SYNC 
      });
      
    } catch (error) {
      console.error("Error starting avatar session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  }
  
  async function handleSpeak() {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    
    // Kullanıcı konuşmasını geçmişe ekle
    setUserConversation(prev => [...prev, text]);
    
    // Process text input through our conversation handler
    await processRecognizedText(text);
    
    // Konuşma alanını temizle
    setText("");
    setIsLoadingRepeat(false);
    
    // Otomatik aşağı kaydır
    setTimeout(scrollToBottom, 100);
  }
  
  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }
    await avatar.current.interrupt().catch((e: any) => {
      setDebug(e.message);
    });
  }
  
  async function endSession() {
    await avatar.current?.stopAvatar();
    setStream(undefined);
    
    // Konuşma geçmişini temizle
    setAiConversation([]);
    setUserConversation([]);
    
    // Arduino bağlantısını kapat
    if (serialPort.current) {
      try {
        await serialPort.current.writer.close();
        await serialPort.current.port.close();
        serialPort.current = null;
        setSerialConnected(false);
        setDebug("Arduino bağlantısı kapatıldı");
      } catch (error) {
        console.error("Arduino bağlantısı kapatma hatası:", error);
      }
    }
  }

  const handleChangeChatMode = useMemoizedFn(async (v) => {
    if (v === chatMode) {
      return;
    }
    
    // Stop any active speech recognition
    if (recognition) {
      stopGoogleSpeechRecognition();
    }
    
    if (v === "text_mode") {
      avatar.current?.closeVoiceChat();
    } else if (v === "voice_mode") {
      await avatar.current?.startVoiceChat();
    } else if (v === "google_voice") {
      avatar.current?.closeVoiceChat();
      // Automatically start Google Speech API recognition
      if (recognition) {
        setTimeout(() => {
          startGoogleSpeechRecognition();
        }, 300); // Small delay to ensure previous modes are properly closed
      }
    }
    
    setChatMode(v);
  });

  const previousText = usePrevious(text);
  useEffect(() => {
    if (!previousText && text) {
      avatar.current?.startListening();
    } else if (previousText && !text) {
      avatar?.current?.stopListening();
    }
  }, [text, previousText]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
      };
    }
  }, [mediaStream, stream]);
  return (
    <div className="w-full flex flex-col gap-4">
      <Card>
        <CardBody className="h-[500px] flex flex-col justify-center items-center">
          {stream ? (
            <div className="h-[500px] w-[900px] justify-center items-center flex rounded-lg overflow-hidden">
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              >
                <track kind="captions" />
              </video>
              
              {/* Chat history removed as requested */}
              
              <div className="flex flex-col gap-2 absolute bottom-3 right-3">
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={handleInterrupt}
                >
                  Interrupt task
                </Button>
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={endSession}
                >
                  End session
                </Button>
              </div>
            </div>
          ) : !isLoadingSession ? (
            <div className="h-full justify-center items-center flex flex-col gap-8 w-[500px] self-center">
              <div className="flex flex-col gap-2 w-full">
                <Select
                  label="Select avatar"
                  placeholder="Select avatar"
                  className="max-w-xs"
                  selectedKeys={[avatarId]}
                  onChange={(e) => {
                    setAvatarId(e.target.value);
                  }}
                >
                  {AVATARS.map((avatar) => (
                    <SelectItem
                      key={avatar.avatar_id}
                      textValue={avatar.avatar_id}
                    >
                      {avatar.name}
                    </SelectItem>
                  ))}
                </Select>
  
                <Select
                  label="Select language"
                  placeholder="Select language"
                  className="max-w-xs"
                  selectedKeys={[language]}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                  }}
                >
                  {STT_LANGUAGE_LIST.map((lang) => (
                    <SelectItem key={lang.key}>{lang.label}</SelectItem>
                  ))}
                </Select>
                
                <Button
                  className="bg-gradient-to-tr from-green-500 to-green-300 text-white mt-4"
                  size="md"
                  variant="shadow"
                  onClick={connectToArduino}
                  disabled={serialConnected}
                >
                  {serialConnected ? "Arduino Bağlı" : "Arduino'ya Bağlan"}
                </Button>
              </div>
              <Button
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white"
                size="md"
                variant="shadow"
                onClick={startSession}
                disabled={!serialConnected}
              >
                {!serialConnected ? "Önce Arduino'ya Bağlanın" : "Oturumu Başlat"}
              </Button>
            </div>
          ) : (
            <Spinner color="default" size="lg" />
          )}
        </CardBody>
        <Divider />
        <CardFooter className="flex flex-col gap-3 relative">
          <Tabs
            aria-label="Options"
            selectedKey={chatMode}
            onSelectionChange={(v) => {
              handleChangeChatMode(v);
            }}
          >
            <Tab key="text_mode" title="Text mode" />
            <Tab key="voice_mode" title="Voice mode" />
            <Tab key="google_voice" title="Google Speech" />
          </Tabs>
          {chatMode === "text_mode" ? (
            <div className="w-full flex relative">
              <InteractiveAvatarTextInput
                disabled={!stream}
                input={text}
                label="Chat"
                loading={isLoadingRepeat}
                placeholder="Type something for the avatar to respond"
                setInput={setText}
                onSubmit={handleSpeak}
              />
              {text && (
                <Chip className="absolute right-16 top-3">Listening</Chip>
              )}
            </div>
          ) : chatMode === "voice_mode" ? (
            <div className="w-full text-center">
              <Button
                isDisabled={!isUserTalking}
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
                size="md"
                variant="shadow"
              >
                {isUserTalking ? "Listening" : "Voice chat"}
              </Button>
            </div>
          ) : (
            <div className="w-full text-center flex flex-col gap-2">
              <Chip
                className={`px-4 py-2 ${isUserTalking ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
              >
                {isUserTalking ? "Dinleniyor..." : "Hazır, konuşmaya başlayabilirsiniz"}
              </Chip>
              <p className="text-xs text-gray-500">
                Dünya Barış Üniversitesi asistanı ile konuşabilirsiniz. Fakülteler, burslar, etkinlikler hakkında sorular sorabilirsiniz.
              </p>
            </div>
          )}
        </CardFooter>
      </Card>
      <p className="font-mono text-right">
        <span className="font-bold">Console:</span>
        <br />
        {debug}
      </p>
    </div>
  );}