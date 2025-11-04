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
        <div className={cn(
          "text-sm leading-relaxed prose prose-sm max-w-none",
          isBot 
            ? "prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-td:text-foreground prose-th:text-foreground prose-code:text-foreground prose-blockquote:text-muted-foreground prose-hr:border-border" 
            : ""
        )}>
          {isBot ? (
            <ReactMarkdown
              components={{
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="w-full border-collapse border border-border rounded-lg" {...props} />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th className="border border-border bg-muted px-4 py-2 text-left font-semibold" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="border border-border px-4 py-2" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-lg font-bold mt-6 mb-3 flex items-center gap-2" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-base font-semibold mt-4 mb-2" {...props} />
                ),
                code: ({ node, inline, ...props }: any) => 
                  inline ? (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                  ) : (
                    <code className="block bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto" {...props} />
                  ),
                hr: ({ node, ...props }) => (
                  <hr className="my-6 border-border" {...props} />
                ),
              }}
            >
              {message}
            </ReactMarkdown>
          ) : (
            <p className="whitespace-pre-wrap text-primary-foreground">{message}</p>
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
