import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  message: string;
  isBot: boolean;
  timestamp?: Date;
}

export const ChatMessage = ({ message, isBot, timestamp }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in",
        isBot ? "justify-start" : "justify-end"
      )}
    >
      {isBot && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
      )}
      
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm transition-all hover:shadow-md",
          isBot
            ? "bg-card text-card-foreground"
            : "bg-gradient-primary text-primary-foreground"
        )}
      >
        <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-invert prose-p:my-2 prose-ul:my-2 prose-li:my-1">
          {isBot ? (
            <ReactMarkdown>{message}</ReactMarkdown>
          ) : (
            <p className="whitespace-pre-wrap">{message}</p>
          )}
        </div>
        {timestamp && (
          <p className={cn(
            "mt-1 text-xs",
            isBot ? "text-muted-foreground" : "text-primary-foreground/70"
          )}>
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {!isBot && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <User className="h-5 w-5 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
};
