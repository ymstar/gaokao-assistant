import { NextRequest } from 'next/server';
import { streamText, convertToModelMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { buildUserContext } from '@/lib/chat/context-builder';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ province: string }> }
) {
  const { province } = await params;
  const body = await request.json();
  const { messages, providerConfig } = body;

  if (!providerConfig?.apiKey || !providerConfig?.baseURL || !providerConfig?.model) {
    return Response.json(
      { error: '请先在设置中配置AI模型' },
      { status: 400 }
    );
  }

  try {
    const provider = createOpenAI({
      baseURL: providerConfig.baseURL,
      apiKey: providerConfig.apiKey,
    });

    const systemPrompt = await buildSystemPrompt(province);

    let combinedSystem = systemPrompt;
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
    if (lastUserMsg) {
      const userText = lastUserMsg.parts
        ?.filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
      if (userText) {
        const userContext = await buildUserContext(userText, province);
        if (userContext) {
          combinedSystem += `\n\n以下是与用户问题相关的数据：\n${userContext}`;
        }
      }
    }

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: provider.chat(providerConfig.model),
      system: combinedSystem,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error('Chat error:', error);
        return `请求失败：${error instanceof Error ? error.message : '未知错误'}。请检查 API Key 和模型配置是否正确。`;
      },
    });
  } catch (error) {
    console.error('Chat setup error:', error);
    const msg = error instanceof Error ? error.message : '未知错误';
    return Response.json({ error: `模型调用失败：${msg}` }, { status: 500 });
  }
}
