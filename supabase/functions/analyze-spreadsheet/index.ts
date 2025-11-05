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

    console.log("📊 Recebendo requisição de análise");
    console.log("📁 Número de planilhas:", spreadsheets?.length || 0);
    
    if (spreadsheets && spreadsheets.length > 0) {
      spreadsheets.forEach((sheet: any, idx: number) => {
        console.log(`\n📄 Planilha ${idx + 1}:`, sheet.filename);
        console.log("  └─ Colunas:", sheet.columns);
        console.log("  └─ Total de linhas:", sheet.rows?.length || 0);
        console.log("  └─ Primeiras 3 linhas:", JSON.stringify(sheet.rows?.slice(0, 3), null, 2));
      });
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Build system prompt with spreadsheet context
    let systemPrompt = `VOCÊ É UM ANALISADOR DE DADOS DE PLANILHAS.

🚨 REGRA CRÍTICA: CALCULE USANDO OS DADOS REAIS DO JSON - NÃO INVENTE NÚMEROS

PASSO A PASSO OBRIGATÓRIO:

1️⃣ LEIA o JSON de dados fornecido abaixo
2️⃣ IDENTIFIQUE quais colunas responder à pergunta
3️⃣ AGRUPE os valores pela coluna relevante (ex: por Cliente, por Produto, por Região)
4️⃣ SOME os valores numéricos de cada grupo
5️⃣ ORDENE do maior para o menor
6️⃣ MOSTRE apenas os Top 5

EXEMPLO DE PROCESSAMENTO:
Pergunta: "Qual cliente comprou mais?"
- Agrupe por coluna "Cliente"
- Some a coluna "Valor_Total" para cada cliente
- Ordene do maior para o menor
- Mostre os 5 maiores

FORMATO DE RESPOSTA:

## 🎯 Pergunta
<repita a pergunta>

## 📊 Análise
- **Planilha:** <nome>
- **Linhas processadas:** <número exato do JSON>
- **Agrupado por:** <coluna usada>
- **Valor somado:** <coluna somada>

## 📊 Top 5 Resultados

| Pos | Item | Valor | % |
|-----|------|-------|---|
| 🥇 | <nome> | <valor calculado> | <percentual> |
| 🥈 | <nome> | <valor calculado> | <percentual> |
| 🥉 | <nome> | <valor calculado> | <percentual> |
| 4º | <nome> | <valor calculado> | <percentual> |
| 5º | <nome> | <valor calculado> | <percentual> |

## ✅ Validação
- **Total geral:** <soma de TODOS os valores>
- **Registros válidos:** <quantidade>

## 🎯 Resposta
**<resposta em 1 frase>**

⚠️ PROIBIDO:
- Inventar números
- Mostrar o JSON
- Mostrar linhas individuais
- Usar valores que não existem no JSON
`;

    if (spreadsheets && spreadsheets.length > 0) {
      systemPrompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      systemPrompt += `📊 DADOS DISPONÍVEIS PARA ANÁLISE\n`;
      systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      spreadsheets.forEach((sheet: any, index: number) => {
        systemPrompt += `📄 PLANILHA ${index + 1}: "${sheet.filename}"\n`;
        systemPrompt += `Colunas: ${sheet.columns.join(", ")}\n`;
        systemPrompt += `Total de registros: ${sheet.rows.length}\n\n`;
        systemPrompt += `💾 DADOS EM JSON (PROCESSE ESTES DADOS - NÃO MOSTRE NA RESPOSTA):\n\`\`\`json\n`;
        systemPrompt += JSON.stringify(sheet.rows, null, 2);
        systemPrompt += `\n\`\`\`\n\n`;
      });
      
      systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      systemPrompt += `⚠️ REGRAS DE RESPOSTA:\n`;
      systemPrompt += `1. NÃO mostre os dados JSON na resposta\n`;
      systemPrompt += `2. NÃO mostre linhas individuais da planilha\n`;
      systemPrompt += `3. MOSTRE apenas: resumo do processamento + tabela de resultados + resposta final\n`;
      systemPrompt += `4. Use os dados acima INTERNAMENTE para calcular\n`;
      systemPrompt += `5. Apresente apenas os RESULTADOS FINAIS de forma limpa e visual\n`;
      systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    } else {
      systemPrompt += "\n\n⚠️ NENHUMA PLANILHA CARREGADA\n\n";
      systemPrompt += "Informe ao usuário que ele precisa enviar planilhas (CSV, XLS ou XLSX) para análise.\n";
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
        max_completion_tokens: 8000,
        temperature: 0,
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
