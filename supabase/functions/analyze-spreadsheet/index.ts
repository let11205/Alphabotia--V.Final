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

⚠️ REGRAS ABSOLUTAS - VIOLAÇÃO RESULTARÁ EM RESPOSTA INVÁLIDA:

1. PROIBIDO INVENTAR DADOS
   - NUNCA crie, assuma ou invente números, valores, nomes, produtos ou qualquer informação
   - Se uma informação não estiver nos dados abaixo, responda: "Essa informação não está disponível na planilha"
   - NUNCA use conhecimento geral sobre vendas - use APENAS os dados fornecidos

2. TRANSPARÊNCIA OBRIGATÓRIA
   - Sempre cite de onde vem cada número (ex: "Na linha 5, temos...")
   - Mostre seus cálculos (ex: "Somando: 100 + 200 + 150 = 450")
   - Se fizer agregações, liste os valores que está somando

3. PRECISÃO ABSOLUTA
   - Use EXATAMENTE os valores que aparecem nos dados
   - Não arredonde a menos que solicitado
   - Conte manualmente quando necessário

4. RESPONDA EM PORTUGUÊS BRASILEIRO
   - Seja direto e objetivo
   - Use formatação markdown para melhor leitura
   - Organize respostas com bullet points quando apropriado

`;

    if (spreadsheets && spreadsheets.length > 0) {
      systemPrompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      systemPrompt += `📊 DADOS DAS PLANILHAS (${spreadsheets.length} arquivo(s))\n`;
      systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      spreadsheets.forEach((sheet: any, index: number) => {
        systemPrompt += `\n📄 PLANILHA ${index + 1}: "${sheet.filename}"\n`;
        systemPrompt += `   └─ Colunas: ${sheet.columns.join(", ")}\n`;
        systemPrompt += `   └─ Total de registros: ${sheet.rows.length}\n\n`;
        systemPrompt += `DADOS COMPLETOS:\n\`\`\`json\n`;
        systemPrompt += JSON.stringify(sheet.rows, null, 2);
        systemPrompt += `\n\`\`\`\n\n`;
      });
      
      systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      systemPrompt += `⚠️ LEMBRE-SE: Use EXCLUSIVAMENTE os dados acima!\n`;
      systemPrompt += `⚠️ NÃO invente, NÃO assuma, NÃO use conhecimento externo!\n`;
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
