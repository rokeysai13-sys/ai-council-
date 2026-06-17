import React, { useState } from 'react';
import { chatService, senseService } from '../services/api';
import ModeSelector from '../components/chat/ModeSelector';
import ChatToolbar from '../components/chat/ChatToolbar';
import ChatHistory from '../components/chat/ChatHistory';
import ChatInput from '../components/chat/ChatInput';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Welcome to the Agentic Workspace. I am ready to assist you. Choose an agent mode above to direct your request.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('master');
  const [ttsActive, setTtsActive] = useState(false);

  const handleSend = async (userMessage) => {
    if (isLoading) return;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    if (mode === 'master') {
      try {
        setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);
        const response = await chatService.sendMessage(
          userMessage, mode, true, null, 'default',
          (token) => {
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant' && last.streaming) {
                last.content += token;
              }
              return updated;
            });
          }
        );
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            last.streaming = false;
            if (response.response) last.content = response.response;
          }
          return updated;
        });
      } catch (error) {
        setMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.streaming) updated.pop();
          updated.push({ role: 'assistant', content: `**Error:** Failed to stream from agent backend. ${error.message}` });
          return updated;
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        const response = await chatService.sendMessage(userMessage, mode);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.response || response.plan || response.execution || JSON.stringify(response),
          metadata: response.metadata || { mode }
        }]);
      } catch (error) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `**Error:** Failed to communicate with agent backend. ${error.response?.data?.detail || error.message}` 
        }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCaptureScreen = async () => {
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: '📸 Taking screenshot and scanning details...' }]);
    try {
      const captureResult = await senseService.captureScreen();
      const ocrResult = await senseService.readScreen();
      const activeWindow = await senseService.activeWindow();
      
      let contextMsg = `I captured your screen at ${captureResult.screenshot_path || 'temporary buffer'}.\n\n`;
      if (activeWindow) {
        contextMsg += `**Active Window:** ${activeWindow.title || 'Unknown'} (Process: ${activeWindow.process || 'N/A'})\n`;
      }
      if (ocrResult?.screen_text) {
        contextMsg += `\n**Recognized Text on Screen:**\n\`\`\`\n${ocrResult.screen_text.substring(0, 1000)}\n\`\`\``;
      } else {
        contextMsg += `\nNo text detected via screen OCR.`;
      }
      setMessages(prev => [...prev, { role: 'assistant', content: contextMsg }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `**Error capturing screen:** ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakMessage = async (content) => {
    setTtsActive(true);
    try {
      const textToSpeak = content.replace(/[*_`#\-]/g, '');
      await senseService.speakText(textToSpeak.substring(0, 500));
    } catch (error) {
      alert('Voice synthesis error: ' + error.message);
    } finally {
      setTtsActive(false);
    }
  };

  const handleSpeakLastMessage = () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistant) handleSpeakMessage(lastAssistant.content);
  };

  const handleClearChat = () => {
    setMessages([{ role: 'assistant', content: 'Chat history cleared. Choose a mode below.' }]);
  };

  return (
    <div className="chat-workspace animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px', height: '100%', background: 'var(--bg-color)' }}>
      <ModeSelector mode={mode} setMode={setMode} />
      <div className="glass-panel" style={{ flex: 1, borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ChatToolbar mode={mode} onClearChat={handleClearChat} onSpeakLast={handleSpeakLastMessage} ttsActive={ttsActive} />
        <ChatHistory messages={messages} isLoading={isLoading} onSpeakMessage={handleSpeakMessage} ttsActive={ttsActive} />
        <ChatInput onSend={handleSend} onCapture={handleCaptureScreen} onSpeakLast={handleSpeakLastMessage} isLoading={isLoading} mode={mode} />
      </div>
    </div>
  );
}
