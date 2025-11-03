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
    let systemPrompt = `Você é um assistente de análise de dados especializado em fornecer respostas diretas e objetivas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 REGRAS ABSOLUTAS - VIOLAÇÃO = RESPOSTA INVÁLIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. FONTE DE DADOS:
   ✓ Use EXCLUSIVAMENTE os dados JSON fornecidos abaixo
   ✓ Se não há planilha: "Não há planilha carregada"
   ✓ Se a informação não existe: "Essa informação não está disponível na planilha"
   ✗ NUNCA invente números, nomes ou informações
   ✗ NUNCA use conhecimento externo

2. FORMATO DE RESPOSTA OBRIGATÓRIO:
   ✓ Resposta DIRETA e FINAL
   ✓ Linguagem natural e conversacional
   ✓ Apenas o RESULTADO, sem mostrar como chegou nele
   
   ✗ PROIBIDO listar linhas ("Na linha 0...", "linha 1...")
   ✗ PROIBIDO mostrar cálculos ("Somando...", "2400 + 1350...")
   ✗ PROIBIDO mostrar processo de análise
   ✗ PROIBIDO listar dados intermediários

3. EXEMPLOS DE RESPOSTAS:

   PERGUNTA: "Qual região teve mais vendas?"
   ✅ CORRETO: "A região Norte liderou com R$ 140.000 em vendas."
   ❌ ERRADO: "Para determinar a região com mais vendas, somamos o Valor_Total... Norte: Na linha 0, Valor_Total: 2400, Na linha 6..."

   PERGUNTA: "Qual o produto mais vendido?"
   ✅ CORRETO: "O produto mais vendido foi Notebook, totalizando 150 unidades."
   ❌ ERRADO: "Analisando as linhas... Na linha 5 temos Notebook com 10, na linha 12 com 20..."

   PERGUNTA: "Total de vendas em janeiro?"
   ✅ CORRETO: "As vendas de janeiro totalizaram R$ 85.000."
   ❌ ERRADO: "Somando: linha 0 (R$ 2400) + linha 3 (R$ 1350) + linha 8 (R$ 900)..."

4. ANTES DE RESPONDER, VERIFIQUE:
   □ Você tem os dados da planilha abaixo?
   □ A informação solicitada existe nos dados?
   □ Você vai apresentar APENAS o resultado final?
   □ Você NÃO vai listar linhas ou cálculos?

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
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.0,
        max_completion_tokens: 8000,
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
