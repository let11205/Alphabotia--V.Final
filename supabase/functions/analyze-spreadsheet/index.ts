import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, spreadsheets } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Build system prompt with spreadsheet context
    let systemPrompt = `Você é o Alphabot IA, um assistente especializado em análise de planilhas de vendas.

REGRAS CRÍTICAS - SIGA EXATAMENTE:
1. NUNCA invente, crie ou assuma dados que não estejam explicitamente nas planilhas
2. Se uma informação não estiver nos dados fornecidos, diga "essa informação não está disponível na planilha"
3. Todos os números, valores e estatísticas DEVEM vir diretamente dos dados das planilhas
4. Quando calcular totais, médias ou agregações, mostre o cálculo baseado nos dados reais
5. Se não houver planilhas carregadas, informe que precisa de dados para análise
6. Use APENAS os dados fornecidos abaixo - não use conhecimento externo sobre vendas

COMO RESPONDER:
- Sempre responda em português brasileiro
- Seja preciso e cite os dados específicos da planilha
- Se fizer cálculos, mostre de onde vieram os números
- Identifique padrões REAIS presentes nos dados
- Seja honesto se alguma análise não for possível com os dados disponíveis

`;

    if (spreadsheets && spreadsheets.length > 0) {
      systemPrompt += `\n\n📊 DADOS DAS PLANILHAS (${spreadsheets.length} arquivo(s)):\n\n`;
      
      spreadsheets.forEach((sheet: any, index: number) => {
        systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        systemPrompt += `PLANILHA ${index + 1}: ${sheet.filename}\n`;
        systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        systemPrompt += `Colunas disponíveis: ${sheet.columns.join(", ")}\n`;
        systemPrompt += `Total de registros: ${sheet.rows.length}\n\n`;
        systemPrompt += `DADOS COMPLETOS:\n`;
        systemPrompt += JSON.stringify(sheet.rows, null, 2);
        systemPrompt += `\n\n`;
      });
      
      systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      systemPrompt += `LEMBRE-SE: Use SOMENTE os dados acima. Não invente informações!\n`;
      systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    } else {
      systemPrompt += "\n\n⚠️ NENHUMA PLANILHA CARREGADA\n\n";
      systemPrompt += "Informe ao usuário que ele precisa enviar planilhas (CSV, XLS ou XLSX) para que você possa fazer análises.\n";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Erro na API de IA:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar análise" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Erro no analyze-spreadsheet:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
