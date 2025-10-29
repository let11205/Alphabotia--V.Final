import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, FileSpreadsheet, TrendingUp, ArrowRight } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto text-center space-y-12 animate-fade-in">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Alphabot IA
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Transforme suas planilhas de vendas em insights incríveis com inteligência artificial avançada
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all hover:scale-105">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>IA Avançada</CardTitle>
              <CardDescription>
                Powered by Gemini 2.5 Pro para análises precisas
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all hover:scale-105">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 mx-auto">
                <FileSpreadsheet className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>Upload Simples</CardTitle>
              <CardDescription>
                Arraste e solte suas planilhas CSV ou Excel
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all hover:scale-105">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 mx-auto">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>Insights Incríveis</CardTitle>
              <CardDescription>
                Insights personalizados para o seu negócio
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Button */}
        <div className="pt-8">
          <Button
            onClick={() => navigate("/chat")}
            size="lg"
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 transition-all text-lg px-8 py-6 rounded-2xl shadow-glow hover:shadow-lg group"
          >
            Ir para o Chat
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Landing;
