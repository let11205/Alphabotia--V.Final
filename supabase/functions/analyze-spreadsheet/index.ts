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
    let systemPrompt = `Você é um assistente de análise de dados. Sua ÚNICA fonte de informação são os dados da planilha fornecidos abaixo.

🚫 REGRAS ABSOLUTAS (VIOLAÇÃO = RESPOSTA INVÁLIDA):

1. FONTE DE DADOS
   - Use SOMENTE os dados JSON fornecidos abaixo
   - Se não há dados na planilha, responda: "Não há planilha carregada"
   - Se a pergunta não pode ser respondida com os dados disponíveis, diga: "Essa informação não está na planilha"
   - NUNCA use conhecimento externo, NUNCA invente números ou nomes

2. FORMATO DE RESPOSTA
   - Responda de forma DIRETA e CONVERSACIONAL
   - NÃO liste "linha 0", "linha 1", etc.
   - NÃO mostre cálculos intermediários
   - Apresente APENAS o resultado final
   - Use linguagem natural e amigável

3. EXEMPLOS:
   ✅ BOM: "A região Norte teve R$ 140.000 em vendas, sendo a líder."
   ❌ RUIM: "Somando linha 0 (2400) + linha 6 (1350)..."
   
   ✅ BOM: "O produto mais vendido foi Notebook, com 150 unidades."
   ❌ RUIM: "Na linha 5 temos Notebook com quantidade 10, na linha 12..."

4. VERIFICAÇÃO ANTES DE RESPONDER
   - Você viu dados da planilha abaixo? Se não, diga que não há planilha
   - A informação solicitada existe nos dados? Se não, informe
   - Seus números vêm dos dados JSON? Se não, NÃO responda

`;

    if (spreadsheets && spreadsheets.length > 0) {
      systemPrompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      systemPrompt += `📊 DADOS DAS PLANILHAS\n`;
      systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      spreadsheets.forEach((sheet: any, index: number) => {
        systemPrompt += `PLANILHA ${index + 1}: "${sheet.filename}"\n`;
        systemPrompt += `Colunas: ${sheet.columns.join(", ")}\n`;
        systemPrompt += `Total de registros: ${sheet.rows.length}\n\n`;
        systemPrompt += `DADOS (use apenas estes):\n\`\`\`json\n`;
        systemPrompt += JSON.stringify(sheet.rows, null, 2);
        systemPrompt += `\n\`\`\`\n\n`;
      });
      
      systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      systemPrompt += `⚠️ IMPORTANTE: Analise os dados JSON acima e responda de forma direta.\n`;
      systemPrompt += `⚠️ NÃO invente nada que não esteja explicitamente nos dados acima!\n`;
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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.0,
        max_tokens: 8000,
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
