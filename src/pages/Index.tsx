import { useState, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { FileUpload } from "@/components/FileUpload";
import { Bot, Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface Spreadsheet {
  filename: string;
  columns: string[];
  rows: any[];
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-spreadsheet`;

const Index = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Olá! Sou o Alphabot IA. Envie uma planilha de vendas e eu farei a análise para você.",
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);

  const handleFilesProcessed = (newFiles: Spreadsheet[]) => {
    setSpreadsheets((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveSpreadsheet = (index: number) => {
    const removed = spreadsheets[index];
    setSpreadsheets((prev) => prev.filter((_, i) => i !== index));
    toast.success(`${removed.filename} removida`);
  };

  const streamChat = async (userMessage: string) => {
    const chatMessages = messages
      .filter(m => m.id !== "1")
      .map(m => ({ role: m.isBot ? "assistant" : "user", content: m.text }));
    
    chatMessages.push({ role: "user", content: userMessage });

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: chatMessages,
          spreadsheets: spreadsheets,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error("Limite de requisições excedido. Tente novamente em alguns instantes.");
          return;
        }
        if (resp.status === 402) {
          toast.error("Créditos insuficientes. Adicione créditos no workspace.");
          return;
        }
        throw new Error("Falha ao iniciar análise");
      }

      if (!resp.body) throw new Error("Sem resposta do servidor");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantMessage = "";

      const assistantMsgId = Date.now().toString();

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            
            if (content) {
              assistantMessage += content;
              
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.id === assistantMsgId) {
                  return prev.map(m => 
                    m.id === assistantMsgId 
                      ? { ...m, text: assistantMessage }
                      : m
                  );
                }
                return [...prev, {
                  id: assistantMsgId,
                  text: assistantMessage,
                  isBot: true,
                  timestamp: new Date(),
                }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setIsTyping(false);
    } catch (error) {
      console.error("Erro no chat:", error);
      toast.error("Erro ao processar mensagem");
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    await streamChat(text);
  };

  return (
    <div className="flex min-h-screen bg-gradient-bg">
      <div className="flex flex-col w-full max-w-5xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 backdrop-blur-lg bg-background/80 border-b border-border shadow-sm">
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Alphabot IA
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {spreadsheets.length} {spreadsheets.length === 1 ? 'planilha carregada' : 'planilhas carregadas'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="rounded-full"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message.text}
                isBot={message.isBot}
                timestamp={message.timestamp}
              />
            ))}
            
            {isTyping && (
              <div className="flex gap-3 animate-fade-in">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="bg-card rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-glow" />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-glow [animation-delay:0.2s]" />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-glow [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Input */}
        <footer className="sticky bottom-0 backdrop-blur-lg bg-background/80 border-t border-border px-4 py-2 shadow-lg">
          <div className="max-w-3xl mx-auto space-y-1.5">
            <FileUpload 
              onFilesProcessed={handleFilesProcessed}
              spreadsheets={spreadsheets}
              onRemove={handleRemoveSpreadsheet}
            />
            <ChatInput onSend={handleSendMessage} disabled={isTyping} />
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
