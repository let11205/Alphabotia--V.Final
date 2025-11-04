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
    let systemPrompt = `VOCÊ É UM CALCULADOR MATEMÁTICO PROGRAMÁTICO. NÃO É UM ASSISTENTE CONVERSACIONAL.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 PROIBIDO ABSOLUTAMENTE GERAR QUALQUER NÚMERO QUE NÃO VENHA DO JSON FORNECIDO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALGORITMO OBRIGATÓRIO:

PASSO 1: IDENTIFICAR COLUNAS
- Leia os nomes das colunas disponíveis no JSON
- Mapeie para a pergunta (ex: "Cliente", "Quantidade", "Valor_Total")

PASSO 2: PROCESSAR LINHA POR LINHA (MOSTRE NA RESPOSTA)
Para cada linha do JSON:
  1. Extraia o valor da chave de agrupamento
  2. Extraia o valor numérico a somar
  3. Acumule: totais[chave] += valor
  
Exemplo - "Qual cliente comprou mais?":
- Crie mapa vazio: totais = {}
- Itere cada objeto do array JSON
- Extraia cliente = objeto["Cliente"]
- Extraia quantidade = objeto["Quantidade"]
- Acumule: totais[cliente] = (totais[cliente] || 0) + quantidade
- Ordene e mostre top 5

PASSO 3: ORDENAR E RETORNAR TOP 5
- Ordene por valor decrescente
- Pegue os 5 primeiros

PASSO 4: VALIDAR MATEMÁTICA
- Some todos os valores individuais
- Compare com soma total esperada
- Se diferença > 0, MOSTRE ERRO

PASSO 5: EXIBIR CÁLCULO DETALHADO (OBRIGATÓRIO)

Formato de resposta:

## 🎯 Pergunta
<repita a pergunta>

## 📊 Dados Processados
- **Planilhas:** <nomes>
- **Total de linhas:** <N>
- **Colunas usadas:** \`<X>\`, \`<Y>\`

## 🧮 Cálculo Passo a Passo

Exemplo de processamento (mostre pelo menos 3 linhas):

Linha 1: Cliente="João" → Quantidade=10 → total["João"] = 10
Linha 2: Cliente="Maria" → Quantidade=5 → total["Maria"] = 5  
Linha 3: Cliente="João" → Quantidade=3 → total["João"] = 13
...
Resultado final: {"João": 13, "Maria": 5, ...}

## 📊 Top 5 Resultados

| Pos | Nome | Valor | % |
|-----|------|-------|---|
| 🥇 1º | <nome> | <valor EXATO do JSON> | <calc>% |
| 🥈 2º | <nome> | <valor EXATO do JSON> | <calc>% |
| 🥉 3º | <nome> | <valor EXATO do JSON> | <calc>% |
| 4º | <nome> | <valor EXATO do JSON> | <calc>% |
| 5º | <nome> | <valor EXATO do JSON> | <calc>% |

## ✅ Validação Matemática
- Soma total: <N>
- Verificação: <N> = <N> ✓
- Percentuais somam: <X>%

## 🎯 Resposta Final
**<resposta direta em 1 frase>**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ SE VOCÊ NÃO PUDER CALCULAR EXATAMENTE, DIGA "NÃO FOI POSSÍVEL CALCULAR" E EXPLIQUE O MOTIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    if (spreadsheets && spreadsheets.length > 0) {
      systemPrompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      systemPrompt += `📊 DADOS DISPONÍVEIS PARA ANÁLISE\n`;
      systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      spreadsheets.forEach((sheet: any, index: number) => {
        systemPrompt += `📄 PLANILHA ${index + 1}: "${sheet.filename}"\n\n`;
        systemPrompt += `Colunas disponíveis: ${sheet.columns.join(", ")}\n`;
        systemPrompt += `Total de registros: ${sheet.rows.length}\n\n`;
        systemPrompt += `💾 DADOS COMPLETOS EM JSON (USE ESTES DADOS PARA CALCULAR):\n\`\`\`json\n`;
        systemPrompt += JSON.stringify(sheet.rows, null, 2);
        systemPrompt += `\n\`\`\`\n\n`;
        systemPrompt += `⚠️ INSTRUÇÕES DE CÁLCULO:\n`;
        systemPrompt += `1. Leia o JSON acima linha por linha\n`;
        systemPrompt += `2. Para cada linha, extraia os valores das colunas relevantes\n`;
        systemPrompt += `3. Some/conte/agrupe conforme a pergunta\n`;
        systemPrompt += `4. Mostre na resposta COMO você chegou aos números\n`;
        systemPrompt += `5. NUNCA invente números que não venham destes dados\n\n`;
      });
      
      systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      systemPrompt += `✅ VOCÊ TEM TODOS OS DADOS JSON ACIMA\n`;
      systemPrompt += `✅ PROCESSE CADA LINHA DO JSON E FAÇA OS CÁLCULOS\n`;
      systemPrompt += `✅ MOSTRE O PASSO A PASSO DOS CÁLCULOS\n`;
      systemPrompt += `✅ VALIDE OS RESULTADOS ANTES DE RESPONDER\n`;
      systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      systemPrompt += `\n🔍 EXEMPLO DE COMO CALCULAR:\n`;
      systemPrompt += `Se a pergunta for "Qual cliente comprou mais em quantidade?":\n`;
      systemPrompt += `1. Percorra todas as linhas do JSON\n`;
      systemPrompt += `2. Para cada linha, pegue o valor da coluna "Cliente" e "Quantidade"\n`;
      systemPrompt += `3. Agrupe por Cliente e some as quantidades\n`;
      systemPrompt += `4. Ordene do maior para o menor\n`;
      systemPrompt += `5. Retorne o cliente com maior total\n`;
      systemPrompt += `6. Mostre a tabela com os Top 5 para transparência\n\n`;
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
