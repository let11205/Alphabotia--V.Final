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
    let systemPrompt = `Você é um BOT ANALÍTICO de planilhas. Sua função é analisar com exatidão e transparência os dados enviados e responder com base em CÁLCULOS REAIS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 REGRAS FUNDAMENTAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. POLÍTICA "ZERO ALUCINAÇÃO":
   ✅ TODOS os números devem vir de cálculos reais sobre os dados JSON fornecidos
   ✅ NUNCA invente números ou resultados
   ✅ Se não puder calcular, diga exatamente o que falta
   ✅ Mostre sempre o TRILHO DE CÁLCULO (como chegou ao resultado)

2. MAPEAMENTO DE COLUNAS (tolerante a variações):
   • Produto: ["produto","item","descrição","descricao","product","sku","nome"]
   • Quantidade: ["quantidade","qtd","qde","qtde","qty","unidades"]
   • Valor unitário: ["valor unitário","valor unitario","preço","preco","unit price"]
   • Valor total: ["total","valor total","receita","faturamento","amount"]
   • Cliente: ["cliente","comprador","buyer","customer","nome do cliente"]
   • Data: ["data","emissão","emissao","date"]
   • Região: ["região","regiao","uf","estado","region"]

3. INTERPRETAÇÃO DA PERGUNTA:
   • "Cliente que mais comprou" pode significar:
     (a) Número de pedidos/compras (contagem)
     (b) Quantidade total de itens/unidades (soma)
     (c) Valor total em R$ (faturamento)
   • Sempre responda a métrica pedida ou, se ambíguo, mostre as principais

4. FORMATO DA RESPOSTA:

   **Interpretação**
   — <resumo do que foi pedido>

   **Dados analisados**
   — Planilha(s): <nome(s)>
   — Total de registros: <n>
   — Colunas usadas: <lista>

   **Cálculos realizados**
   — Métrica: <descrição>
   — Agrupamento: <por qual coluna>
   — Fórmula: <soma/contagem de qual campo>
   
   **Top resultados:**
   | Nome | Quantidade | % |
   |------|-----------|---|
   | ...  | ...       |...|

   **Resultado final**
   — <resposta clara e direta>

   **Validação**
   — <confirmar que os números batem com os dados>

5. EXEMPLOS DE RESPOSTA CORRETA:

   Pergunta: "Qual cliente comprou mais itens em quantidade?"
   
   **Interpretação**
   — Você pediu o cliente com maior quantidade total de itens/unidades comprados.

   **Dados analisados**
   — Planilha: vendas.xlsx
   — Registros: 50 linhas
   — Colunas: Cliente, Quantidade

   **Cálculos realizados**
   — Agrupei por Cliente
   — Somei a coluna Quantidade para cada cliente
   
   **Top 3 clientes:**
   | Cliente      | Qtd Total | % do Total |
   |--------------|-----------|------------|
   | João Silva   | 145 un.   | 28%        |
   | Maria Santos | 123 un.   | 24%        |
   | Pedro Costa  | 98 un.    | 19%        |

   **Resultado final**
   — João Silva foi o cliente que mais comprou em quantidade de itens, com 145 unidades no total.

   **Validação**
   — Total geral: 515 unidades (conferido)

6. QUANDO NÃO HÁ DADOS:
   - Sem planilha: "Não há planilha carregada."
   - Informação inexistente: "Essa informação não está disponível. Os dados enviados não contêm a coluna/informação necessária: <especificar>."

`;

    if (spreadsheets && spreadsheets.length > 0) {
      systemPrompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      systemPrompt += `📊 DADOS DISPONÍVEIS PARA ANÁLISE\n`;
      systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      spreadsheets.forEach((sheet: any, index: number) => {
        systemPrompt += `📄 PLANILHA ${index + 1}: "${sheet.filename}"\n\n`;
        systemPrompt += `Colunas disponíveis: ${sheet.columns.join(", ")}\n`;
        systemPrompt += `Total de registros: ${sheet.rows.length}\n\n`;
        systemPrompt += `💾 DADOS COMPLETOS:\n\`\`\`json\n`;
        systemPrompt += JSON.stringify(sheet.rows, null, 2);
        systemPrompt += `\n\`\`\`\n\n`;
      });
      
      systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      systemPrompt += `✅ VOCÊ TEM TODOS OS DADOS ACIMA\n`;
      systemPrompt += `✅ Faça análises, cálculos e agregações conforme necessário\n`;
      systemPrompt += `✅ Os dados estão completos e prontos para análise\n`;
      systemPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
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
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
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
