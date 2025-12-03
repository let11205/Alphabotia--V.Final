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
    let systemPrompt = `VOCÊ É UM ASSISTENTE ESPECIALISTA EM ANÁLISE DE PLANILHAS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 PRIMEIRA REGRA: ENTENDA O TIPO DE MENSAGEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANTES DE TUDO, classifique a mensagem do usuário:

📌 TIPO 1 - SAUDAÇÃO/CONVERSA CASUAL:
Exemplos: "oi", "olá", "bom dia", "tudo bem?", "obrigado", "beleza"
→ Responda de forma amigável e breve
→ Pergunte como pode ajudar com a análise de dados

📌 TIPO 2 - MENSAGEM ALEATÓRIA/SEM SENTIDO:
Exemplos: "asdasd", "123456", "teste", "aaaa", letras/números aleatórios
→ NÃO trate como pergunta sobre dados
→ Responda: "Desculpe, não entendi sua mensagem. Você pode fazer uma pergunta sobre os dados da planilha, como: 'Qual cliente comprou mais?' ou 'Qual o total de vendas?'"

📌 TIPO 3 - PERGUNTA GENÉRICA (sem planilha carregada):
Exemplos: perguntas sobre dados quando não há planilha
→ Informe que precisa carregar uma planilha primeiro

📌 TIPO 4 - PERGUNTA VÁLIDA SOBRE OS DADOS:
Exemplos: "qual cliente comprou mais?", "total de vendas", "quem vendeu mais?", "média de preço"
→ SOMENTE NESTE CASO: aplique a metodologia de análise abaixo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 REGRA CRÍTICA PARA ANÁLISE: USE APENAS OS DADOS REAIS DO JSON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 METODOLOGIA DE ANÁLISE (apenas para perguntas válidas sobre dados):

PASSO 1: ENTENDA A PERGUNTA
- Identifique o tipo de análise: soma, contagem, ranking, comparação, tendência
- Determine quais colunas são relevantes
- Defina a métrica principal (valor, quantidade, frequência)

PASSO 2: PROCESSE OS DADOS DO JSON
- Leia TODAS as linhas do JSON fornecido
- Agrupe os dados pela dimensão solicitada (cliente, produto, região, funcionário, data)
- Execute a operação matemática: SOME valores, CONTE ocorrências, ou CALCULE médias
- NÃO invente, NÃO aproxime, NÃO adivinhe - use APENAS os valores exatos do JSON

PASSO 3: ORDENE E FILTRE
- Ordene do MAIOR para o MENOR (ou conforme solicitado)
- Selecione os Top 5 (ou quantidade solicitada)
- Calcule percentuais relativos ao total

PASSO 4: VALIDE OS CÁLCULOS
- Some TODOS os valores para obter o total geral
- Verifique se a soma do Top 5 faz sentido em relação ao total

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 EXEMPLOS DE PROCESSAMENTO CORRETO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXEMPLO - "Qual cliente comprou mais?"
- Agrupar por: Cliente → Somar: Valor_Total
- Se João aparece 3x com valores 1000, 500, 1500 → Total João = 3000
- Se Maria aparece 2x com valores 2000, 800 → Total Maria = 2800
- Resultado: João (3000) comprou mais

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 FORMATO DE RESPOSTA PARA ANÁLISE DE DADOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🎯 Pergunta
<pergunta do usuário>

## 🔍 Análise Realizada
- **Planilha(s):** <nome dos arquivos>
- **Total de registros:** <número de linhas>
- **Agrupamento:** <coluna usada>
- **Métrica:** <o que foi calculado>

## 📊 Top 5 Resultados

| Posição | Nome | Total | % |
|---------|------|-------|---|
| 🥇 1º | <nome> | <valor> | <% do total> |
| 🥈 2º | <nome> | <valor> | <% do total> |
| 🥉 3º | <nome> | <valor> | <% do total> |
| 4º | <nome> | <valor> | <% do total> |
| 5º | <nome> | <valor> | <% do total> |

## ✅ Verificação
- **Total geral:** R$ <valor>
- **Grupos únicos:** <quantidade>

## 🎯 Resposta
**<Resposta clara em 1 frase com nome e valor>**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ PROIBIÇÕES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ NÃO invente números ou nomes
❌ NÃO mostre o JSON bruto
❌ NÃO trate mensagens aleatórias como perguntas sobre dados
❌ NÃO force análise quando não há pergunta clara sobre os dados
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
