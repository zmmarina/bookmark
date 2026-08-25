import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = false;

export async function POST(context: APIContext) {
    try {
        const { message } = await context.request.json();

        if (!message || typeof message !== 'string' || !message.trim()) {
            return new Response(
                JSON.stringify({ error: 'Mensagem vazia.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Monta a lista de livros a partir dos posts do blog
        const allPosts = await getCollection('blog');
        const books = allPosts.map((post) => ({
            title: post.data.title,
            author: post.data.author,
            tags: post.data.tags,
            hot: post.data.hot,
            nota: post.data.nota,
            couple: post.data.couple,
            description: post.data.description,
        }));

        const apiKey = import.meta.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'Chave da API não configurada no servidor.' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const systemPrompt = `Você é o agente de indicação de livros do site Bookmark, um blog de resenhas de romance.
Sua tarefa é recomendar livros da lista abaixo com base no que a pessoa pede, usando um tom caloroso e direto, como a dona do blog falaria.
Responda em português, em no máximo 25 palavras, citando o título e a autora do(s) livro(s) recomendado(s) e um motivo bem curto.
Se nada da lista combinar com o pedido, diga isso com sinceridade em uma frase e sugira o que mais chegar perto.
Nunca invente livros que não estejam na lista. Nunca ultrapasse o limite de palavras.

Lista de livros disponíveis (em JSON):
${JSON.stringify(books, null, 2)}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey,
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: `${systemPrompt}\n\nPedido da pessoa: ${message}` }],
                        },
                    ],
                    generationConfig: {
                        maxOutputTokens: 70,
                        temperature: 0.7,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error('Erro da API do Gemini:', errText);
            return new Response(
                JSON.stringify({ error: 'Erro ao consultar o agente.' }),
                { status: 502, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const data = await response.json();
        const reply =
            data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
            'Não consegui pensar em uma indicação agora — tenta perguntar de outro jeito?';

        return new Response(JSON.stringify({ reply }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('Erro no endpoint do agente:', err);
        return new Response(
            JSON.stringify({ error: 'Erro interno.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}