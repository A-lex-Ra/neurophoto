'use client'
import Image from "next/image";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Tool } from './services/api';
import { ToolSelector } from './components/ToolSelector';
import { ToolParameters } from './components/ToolParameters';
import { PromptInput } from './components/PromptInput';
import { GenerateButton } from './components/GenerateButton';
import { ErrorMessage } from './components/ErrorMessage';
import { Header } from './components/Header';

export default function Home() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [prompt, setPrompt] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<React.ReactNode | null>(null)
  const [progress, setProgress] = useState(0)
  const [textResponse, setTextResponse] = useState<string | null>(null)

  // Tools state
  const [tools, setTools] = useState<Tool[]>([])
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [toolParams, setToolParams] = useState<Record<string, any>>({})

  useEffect(() => {
    if (status === 'authenticated') {
      loadTools();
    }
  }, [status]);

  const loadTools = async () => {
    try {
      const toolsList = await api.getTools();
      setTools(toolsList);
      if (toolsList.length > 0) {
        setSelectedTool(null); //TODO: 'generate' tool when no image, toolsList[0].name otherwise
      }
    } catch (err) {
      console.error('Failed to load tools:', err);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setSelectedImage(reader.result as string)
    }
    reader.readAsDataURL(file)

    try {
      const uploadedFile = await api.uploadFile(file)
      setSelectedFileId(uploadedFile.id)
      setError(null)
    } catch (err) {
      setError(
        <span>
          Ошибка! Не удалось загрузить изображение: Вероятно, вы не авторизованы.{' '}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium font-bold transition-colors">
            Войдите
          </Link>{' '}
          в аккаунт.
        </span>
      )
      console.error(err)
      setSelectedImage(null);
    }
  }

  const handleToolParamChange = (name: string, value: any) => {
    setToolParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStream = async (
    apiCall: () => Promise<any>,
    onSuccess: (data: any) => void
  ) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setTextResponse(null);

    let eventSource: any = null;

    try {
      const result = await apiCall();
      console.log('Job started:', result);

      let streamUrl = result.streamUrl;

      // Fix for local development where frontend (3000) needs to hit backend (8080)
      // If streamUrl is relative and api.baseUrl is absolute, prepend the origin
      if (streamUrl.startsWith('/') && api.baseUrl.startsWith('http')) {
        try {
          const url = new URL(api.baseUrl);
          streamUrl = `${url.origin}${streamUrl}`;
        } catch (e) {
          console.error('Failed to parse api.baseUrl', e);
        }
      }

      console.log('Connecting to SSE:', streamUrl);

      eventSource = new EventSource(streamUrl);

      eventSource.onopen = () => {
        console.log('✅ SSE connection opened');
      };

      eventSource.addEventListener('progress', (event: any) => {
        try {
          const data = JSON.parse(event.data);

          if (data.progress !== undefined) {
            setProgress(data.progress);
          }

          if (data.returnvalue?.status === 'COMPLETED' || data.returnvalue?.result?.imageUrl) {
            console.log('🎉 Generation COMPLETED');
            onSuccess(data.returnvalue.result);

            eventSource.close();
            setLoading(false);

            // Update credits
            if (session?.user?.credits !== undefined) {
              const newCredits = Math.max(0, session.user.credits - 1);
              update({ trigger: 'update', credits: newCredits });
            }
          } else if (data.status === 'failed') {
            console.log('❌ Generation FAILED');
            setError('Ошибка генерации');
            eventSource.close();
            setLoading(false);
          }
        } catch (error) {
          console.error('❌ Parse error:', error);
        }
      });

      eventSource.onerror = (error: any) => {
        console.log('🔴 SSE error:', error);
        // Don't close immediately on error as it might be temporary connection issue
        // But if it persists, browser will handle retry or we can close
      };

    } catch (err) {
      console.error('💥 Execution error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка выполнения');
      setLoading(false);
      if (eventSource) eventSource.close();
    }
  };

  const handleToolRun = async () => {
    if (!selectedTool) return;
    if (!selectedFileId) {
      setError('Пожалуйста, загрузите изображение');
      return;
    }

    const params = {
      image: selectedFileId,
      ...toolParams
    };

    await handleStream(
      () => api.callTool(selectedTool, params),
      (result) => {
        if (result.imageUrl) {
          setSelectedImage(result.imageUrl);
          setSelectedFileId(result.imageFileId);
        }
        setTextResponse(result.text);
      }
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Пожалуйста, введите промпт');
      return;
    }

    await handleStream(
      () => api.generate(prompt, selectedFileId ?? undefined),
      (result) => {
        if (result.imageUrl) {
          setSelectedImage(result.imageUrl);
          setSelectedFileId(result.imageFileId);
        }
        setTextResponse(result.text);
        setPrompt('');
      }
    );
  };

  const currentTool = tools.find(t => t.name === selectedTool);

  return (
    <main className="relative min-h-screen bg-background text-foreground flex flex-col items-center justify-end">
      <Header />

      {/* Canvas area */}
      <div className="absolute inset-0 flex items-center justify-center z-5 pointer-events-auto">
        {!selectedImage ? (
          <label className="cursor-pointer flex flex-col items-center justify-center w-3/4 max-w-[780px] h-[400px] border-2 border-dashed border-border rounded-xl bg-secondary/20 hover:bg-secondary/30 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-12 h-12 text-muted-foreground mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16V4m0 0l-4 4m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span className="text-muted-foreground text-lg font-medium px-2 text-center">
              Загрузите или сгенерируйте картинку
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </label>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <img
              src={selectedImage}
              alt="Canvas"
              className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing"
            />

            {/* Buttons on image */}
            <div className="absolute top-4 inset-x-0 mx-auto w-fit flex gap-2 bg-card rounded-lg shadow-lg p-2">
              {/* Download */}
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = selectedImage;
                  a.download = `image_${selectedFileId}.png`;
                  a.click();
                }}
                className="bg-primary text-primary-foreground p-2 rounded-lg hover:bg-primary/90 shadow-lg hover:cursor-pointer"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              {/* Close */}
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setSelectedFileId(null);
                }}
                className="bg-accent text-accent-foreground p-2 rounded-lg hover:bg-accent/90 shadow-lg hover:cursor-pointer"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top area: bubbles */}
      <div className="flex flex-col items-center w-full max-w-[780px] flex-grow justify-end space-y-6 z-10 pointer-events-none">
        {currentTool && selectedImage && (
          <ToolParameters
            tool={currentTool}
            values={toolParams}
            onChange={handleToolParamChange}
            onRun={handleToolRun}
            loading={loading}
          />
        )}
      </div>

      {/* Bottom: prompt form and tool selector */}
      <div className="w-full max-w-[780px] space-y-2 z-10">
        {/* Tool selector */}
        {tools.length > 0 && selectedImage && (
          <div className="bg-card rounded-lg shadow-lg p-4">
            <ToolSelector
              tools={tools}
              selectedTool={selectedTool}
              onSelect={setSelectedTool}
            />
          </div>
        )}

        {/* Prompt form */}
        <ErrorMessage message={error} />
        {(<div className="bg-card rounded-lg shadow-lg p-4">
          <div className="flex items-end gap-2">
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={handleGenerate}
              disabled={loading}
            />
            <GenerateButton
              onClick={handleGenerate}
              loading={loading}
              disabled={!prompt.trim()}
            />
          </div>
        </div>)}
      </div>
    </main>
  )
}