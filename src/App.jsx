import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const CHATBOT_API_KEY = "9d17d712aa754b5792d261e228a53291";

function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "assistant",
      text: "Hello! I’m your AI Health Assistant. I can help you with health questions, symptoms, nutrition advice, mental health support and information about hospital services. How can I assist you today?",
      time: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef(null);
  const recognitionRef = useRef(null);

  const clickAudioRef = useRef(null);
  const replyAudioRef = useRef(null);
  const errorAudioRef = useRef(null);

  useEffect(() => {
    clickAudioRef.current = new Audio("/sounds/click.mp3");
    replyAudioRef.current = new Audio("/sounds/reply.mp3");
    errorAudioRef.current = new Audio("/sounds/error.mp3");

    clickAudioRef.current.volume = 0.4;
    replyAudioRef.current.volume = 0.5;
    errorAudioRef.current.volume = 0.5;
  }, []);

  const playSound = (audioRef) => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {}
  };

  const playClick = () => playSound(clickAudioRef);
  const playReply = () => playSound(replyAudioRef);
  const playError = () => playSound(errorAudioRef);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = "en-US";
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSend(transcript);
      };
      recognitionRef.current = rec;
    }
  }, []);

  const formatTime = (date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const addMessage = (text, sender) => {
    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, sender, text, time: new Date() },
    ]);
  };

  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  };

  const startVoiceInput = () => {
    playClick();
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    recognitionRef.current.start();
  };

  const handleSendClick = () => {
    if (!input.trim()) return;
    playClick();
    handleSend(input.trim());
    setInput("");
  };

  const handleSend = (text) => {
    addMessage(text, "user");
    callChatbotApi(text);
  };

  const localFallbackReply = (userText) => {
    const lower = userText.toLowerCase();
    if (lower.includes("chest") || lower.includes("heart attack")) {
      return "Chest discomfort can have many causes. Warning signs of a possible heart attack include chest pressure or pain, pain spreading to the arm, jaw or back, shortness of breath, sweating, or nausea. If symptoms are severe or sudden, please seek emergency care immediately.";
    }
    if (lower.includes("ibuprofen")) {
      return "Ibuprofen is a non-steroidal anti-inflammatory drug (NSAID) used to reduce pain, inflammation and fever. Always follow the dosage on the label or your doctor’s advice.";
    }
    if (lower.includes("cetirizine")) {
      return "Cetirizine is an antihistamine commonly used for allergies such as sneezing, runny nose and itchy eyes. It can make some people drowsy, so take it as directed.";
    }
    return "I can give general health information and help you understand symptoms or hospital services. Please describe your question in more detail. For emergencies, contact your nearest hospital immediately.";
  };

  const callChatbotApi = async (userText) => {
    setIsTyping(true);

    try {
      const res = await fetch("https://api.aimlapi.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CHATBOT_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a friendly hospital AI assistant. Give clear, short, safe health information. Always remind users to see a doctor for diagnosis.",
            },
            { role: "user", content: userText },
          ],
        }),
      });

      console.log("HTTP status:", res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("API error:", errorText);

        const fallback = localFallbackReply(userText);
        addMessage(fallback, "assistant");
        playError();
        return;
      }

      const data = await res.json();
      console.log("API data:", data);

      const reply =
        data.choices?.[0]?.message?.content ||
        "I’m sorry, I couldn’t generate a proper answer.";

      addMessage(reply, "assistant");
      playReply();
    } catch (err) {
      console.error("Network error:", err);

      const fallback = localFallbackReply(userText);
      addMessage(fallback, "assistant");
      playError();
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickClick = (text) => {
    playClick();
    addMessage(text, "user");
    callChatbotApi(text);
  };

  const handleArClick = () => {
    playClick();
    addMessage(
      "In the full app, this would open an AR visualisation showing what happens in the heart during a possible heart attack.",
      "assistant"
    );
    playReply();
  };

  return (
    <div className="page">
      <div className="phone-frame">
        <div className="inner-panel">
          <header className="top-header">
            <h1 className="app-title">AI Virtual Assistant</h1>
            <p className="app-subtitle">
              Get instant answers to your health inquiries 24/7
            </p>
          </header>

          <div className="chat-area" ref={chatRef}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`msg-row ${m.sender === "user" ? "right" : "left"}`}
              >
                {m.sender === "assistant" && (
                  <div className="avatar bot">🤖</div>
                )}

                <div className={`bubble-wrap ${m.sender}`}>
                  <div className={`bubble ${m.sender}`}>
                    {m.text}

                    {m.sender === "assistant" && (
                      <button
                        className="tts-btn"
                        onClick={() => {
                          playClick();
                          speak(m.text);
                        }}
                        title="Listen"
                      >
                        🔊
                      </button>
                    )}
                  </div>
                  <span className="time">{formatTime(m.time)}</span>
                </div>

                {m.sender === "user" && <div className="avatar user">👩</div>}
              </div>
            ))}

            {isTyping && (
              <div className="msg-row left">
                <div className="avatar bot">🤖</div>
                <div className="bubble-wrap assistant">
                  <div className="bubble assistant typing">
                    Assistant is typing…
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="quick-row">
            <button
              className="quick-btn"
              onClick={() => handleQuickClick("I want to book an appointment.")}
            >
              Book an appointment
            </button>
            <button
              className="quick-btn"
              onClick={() =>
                handleQuickClick("What is the emergency contact number?")
              }
            >
              Emergency contact
            </button>
          </div>

          <div className="quick-row">
            <button
              className="quick-btn"
              onClick={() =>
                handleQuickClick("Give me some healthy diet tips.")
              }
            >
              Healthy diet tips
            </button>
            <button
              className="quick-btn"
              onClick={() =>
                handleQuickClick("How can I manage stress and anxiety?")
              }
            >
              How to manage stress?
            </button>
          </div>

          <button className="ar-btn" onClick={handleArClick}>
            VIEW AR EXPERIENCE
          </button>

          <div className="input-row">
            <button
              className="mic-icon"
              type="button"
              onClick={startVoiceInput}
              title="Speak your question"
            >
              🎤
            </button>

            <input
              className="chat-input"
              placeholder="Type your health question here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendClick();
              }}
            />

            <button
              className="send-icon"
              type="button"
              onClick={handleSendClick}
              title="Send"
            >
              ➤
            </button>
          </div>

          <p className="disclaimer">
            This AI chatbot provides general information only and is not a
            substitute for professional medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
