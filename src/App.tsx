import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Wand2, Download, ArrowLeft, Settings, Image as ImageIcon, CheckCircle, Sparkles, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound } from './lib/audio';
import { enhanceImageAI, applyMagicAI, enhancePromptAI } from './lib/gemini';

type AppState = 'home' | 'camera' | 'preview' | 'mode_select' | 'configure' | 'result' | 'loading';

interface ModeConfig {
  hairStyle: string;
  hairColor: string;
  eyeshadow: string;
  eyeshadowColor: string;
  blush: string;
  blushColor: string;
  lipstick: string;
  lipstickColor: string;
  eyeliner: string;
  eyelinerColor: string;
  eyebrows: string;
}

export default function App() {
  const [step, setStep] = useState<AppState>('home');
  const [previousStep, setPreviousStep] = useState<AppState>('home');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [loadingText, setLoadingText] = useState('Processando...');

  const [simpleConfig, setSimpleConfig] = useState<ModeConfig>({
    hairStyle: 'Natural', hairColor: '#000000',
    eyeshadow: 'Natural', eyeshadowColor: '#d3b092',
    blush: 'Suave', blushColor: '#ffb6c1',
    lipstick: 'Natural', lipstickColor: '#c82e46',
    eyeliner: 'Nenhum', eyelinerColor: '#000000',
    eyebrows: 'Natural'
  });
  const [advancedPrompt, setAdvancedPrompt] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const resizeImage = (dataUrl: string, maxSize = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = dataUrl;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    playSound('click');
    const file = event.target.files?.[0];
    if (file) {
      setStep('loading');
      setLoadingText('Carregando foto...');
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        const resized = await resizeImage(result);
        setOriginalImage(resized);
        setEnhancedImage(null);
        setStep('preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    playSound('click');
    setStep('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (err) {
      alert('Não foi possível acessar a câmera');
      setStep('home');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const takePhoto = async () => {
    playSound('shutter');
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      stopCamera();
      
      setStep('loading');
      setLoadingText('Processando foto...');
      const resized = await resizeImage(dataUrl);
      setOriginalImage(resized);
      setEnhancedImage(null);
      setStep('preview');
    }
  };

  const improveWithAIBase = async () => {
    if (!originalImage) return;
    playSound('click');
    setPreviousStep('preview');
    setStep('loading');
    setLoadingText('Melhorando com IA... transformando em estúdio profissional');
    try {
      const result = await enhanceImageAI(originalImage);
      setEnhancedImage(result);
      playSound('success');
      setStep('preview');
    } catch (err) {
      alert('Erro ao melhorar a imagem.');
      setStep('preview');
    }
  };

  const startConfiguration = () => {
    playSound('click');
    setStep('mode_select');
  };

  const executeMagic = async () => {
    playSound('click');
    const baseImage = enhancedImage || originalImage;
    if (!baseImage) return;
    
    setPreviousStep('configure');
    setStep('loading');
    setLoadingText('Fazendo a mágica... aplicando sua beleza');
    
    let finalPrompt = '';
    if (mode === 'simple') {
      const { hairStyle, hairColor, eyeshadow, eyeshadowColor, blush, blushColor, lipstick, lipstickColor, eyeliner, eyelinerColor, eyebrows } = simpleConfig;
      finalPrompt = `Hair style: ${hairStyle} (color hex ${hairColor}). Eyeshadow: ${eyeshadow} (color hex ${eyeshadowColor}). Blush: ${blush} (color hex ${blushColor}). Lipstick: ${lipstick} (color hex ${lipstickColor}). Eyeliner: ${eyeliner} (color hex ${eyelinerColor}). Eyebrows: ${eyebrows}.`;
    } else {
      finalPrompt = advancedPrompt;
    }

    try {
      const result = await applyMagicAI(baseImage, finalPrompt);
      setResultImage(result);
      playSound('magic');
      setStep('result');
    } catch (err) {
      alert('Erro ao gerar imagem.');
      setStep('configure');
    }
  };

  const improvePrompt = async () => {
    if (!advancedPrompt.trim()) return;
    playSound('click');
    setPreviousStep('configure');
    setStep('loading');
    setLoadingText('Aprimorando prompt com IA...');
    try {
      const improved = await enhancePromptAI(advancedPrompt);
      setAdvancedPrompt(improved);
      playSound('success');
      setStep('configure');
    } catch (err) {
      alert('Erro ao melhorar prompt.');
      setStep('configure');
    }
  };

  // Helper for simple config update
  const updateConfig = (key: keyof ModeConfig, value: string) => {
    playSound('click');
    setSimpleConfig(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="h-screen bg-[#fce7f3] text-black font-sans flex flex-col overflow-hidden">
      <header className="w-full bg-[#f9a8d4] border-b-2 border-black py-4 px-6 flex items-center justify-between z-10 font-sans">
        <div className="text-xl md:text-2xl font-extrabold uppercase tracking-[2px] text-black">
          VIRTUAL BEAUTY STUDIO
        </div>
        <div className="hidden md:flex items-center gap-2 text-[0.7rem] font-bold text-[#1e3a8a] uppercase">
          <Volume2 className="w-4 h-4" /> Áudio de Interface Ativo
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-6 flex flex-col items-center justify-center overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {step === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center gap-8 w-full max-w-lg mx-auto bg-white border-2 border-black rounded-xl p-8 shadow-sm">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-extrabold text-black uppercase tracking-tight">Descubra seu novo visual</h2>
                <p className="text-sm font-medium text-slate-600 max-w-lg">Nosso estúdio usa Inteligência Artificial avançada para aplicar maquiagens perfeitas e estilos de cabelo de salão na sua foto.</p>
              </div>
              
              <div className="flex flex-col gap-4 w-full max-w-md mt-4">
                <button onClick={startCamera} className="w-full flex items-center justify-center gap-3 bg-[#2563eb] text-white py-3 px-6 rounded-lg font-semibold border-2 border-[#1e3a8a] transition-transform hover:-translate-y-1 shadow-sm">
                  <Camera className="w-5 h-5" />
                  Tirar Foto
                </button>
                
                <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-3 bg-white text-[#2563eb] py-3 px-6 rounded-lg font-semibold border-2 border-[#1e3a8a] transition-transform hover:-translate-y-1 shadow-sm">
                  <Upload className="w-5 h-5" />
                  Carregar Foto
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
              </div>
            </motion.div>
          )}

          {step === 'camera' && (
            <motion.div key="camera" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
              <div className="relative w-full aspect-[3/4] bg-black border-4 border-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.2)] overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover mirror" style={{ transform: 'scaleX(-1)' }} />
              </div>
              <div className="flex gap-4 w-full">
                <button onClick={() => { stopCamera(); setStep('home'); }} className="flex-1 py-3 bg-white text-black rounded-lg font-semibold border-2 border-black shadow-sm transition-transform hover:-translate-y-1">
                  Cancelar
                </button>
                <button onClick={takePhoto} className="flex-1 py-3 bg-[#2563eb] text-white rounded-lg font-semibold border-2 border-[#1e3a8a] shadow-sm transition-transform hover:-translate-y-1 flex items-center justify-center gap-2">
                  <Camera className="w-5 h-5" />
                  Capturar
                </button>
              </div>
            </motion.div>
          )}

          {step === 'preview' && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
              <div className="relative w-full flex-1 min-h-[40vh] max-h-[60vh] bg-black border-4 border-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.2)] overflow-hidden flex items-center justify-center">
                <img src={enhancedImage || originalImage!} alt="Preview" className="w-full h-full object-cover opacity-90" />
                {enhancedImage && (
                  <div className="absolute top-4 right-4 bg-[#2563eb] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md">
                    IA Enhanced Ready
                  </div>
                )}
              </div>
              <div className="flex flex-col w-full gap-4">
                {!enhancedImage ? (
                  <>
                    <button onClick={improveWithAIBase} className="w-full py-3 bg-[#2563eb] text-white rounded-lg font-semibold border-2 border-[#1e3a8a] shadow-sm transition-transform hover:-translate-y-1 flex items-center justify-center gap-3">
                      <Wand2 className="w-5 h-5" />
                      Melhorar com IA
                    </button>
                    <button onClick={startConfiguration} className="w-full py-3 bg-white text-black rounded-lg font-semibold border-2 border-black shadow-sm transition-transform hover:-translate-y-1">
                      Continuar sem melhorar
                    </button>
                  </>
                ) : (
                  <>
                    <a href={enhancedImage} download="beauty-studio-enhanced.jpg" className="w-full py-3 bg-white text-[#2563eb] rounded-lg font-semibold border-2 border-[#1e3a8a] shadow-sm transition-transform hover:-translate-y-1 flex items-center justify-center gap-3 text-center">
                      <Download className="w-5 h-5" />
                      Baixar imagem
                    </a>
                    <button onClick={startConfiguration} className="w-full py-3 bg-[#2563eb] text-white rounded-lg font-semibold border-2 border-[#1e3a8a] shadow-sm transition-transform hover:-translate-y-1">
                      Iniciar
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {step === 'mode_select' && (
            <motion.div key="mode_select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center gap-8 max-w-md mx-auto w-full">
              <h2 className="text-2xl font-bold text-black text-center uppercase tracking-tight">Como deseja editar?</h2>
              
              <div className="flex flex-col gap-4 w-full">
                <label className={`relative flex flex-col p-6 border-2 rounded-xl cursor-pointer transition-transform hover:-translate-y-1 ${mode === 'simple' ? 'bg-[#fdf2f8] border-[#2563eb]' : 'bg-white border-black'}`}>
                  <input type="radio" value="simple" checked={mode === 'simple'} onChange={() => setMode('simple')} className="sr-only" />
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-bold text-black uppercase">Modo Simples</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mode === 'simple' ? 'border-[#2563eb]' : 'border-black'}`}>
                      {mode === 'simple' && <div className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />}
                    </div>
                  </div>
                  <span className="text-sm text-slate-600 font-medium mt-1">Escolha opções de cabelo, sombra, batom e cores em menus fáceis de usar.</span>
                </label>

                <label className={`relative flex flex-col p-6 border-2 rounded-xl cursor-pointer transition-transform hover:-translate-y-1 ${mode === 'advanced' ? 'bg-[#fdf2f8] border-[#2563eb]' : 'bg-white border-black'}`}>
                  <input type="radio" value="advanced" checked={mode === 'advanced'} onChange={() => setMode('advanced')} className="sr-only" />
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-bold text-black uppercase">Modo Avançado</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mode === 'advanced' ? 'border-[#2563eb]' : 'border-black'}`}>
                      {mode === 'advanced' && <div className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />}
                    </div>
                  </div>
                  <span className="text-sm text-slate-600 font-medium mt-1">Descreva livremente o estilo, penteado e maquiagem exatos que você deseja.</span>
                </label>
              </div>

              <button onClick={() => setStep('configure')} className="w-full py-3 bg-[#2563eb] text-white rounded-lg font-semibold border-2 border-[#1e3a8a] shadow-sm transition-transform hover:-translate-y-1 mt-4">
                Vamos lá!
              </button>
            </motion.div>
          )}

          {step === 'configure' && (
            <motion.div key="configure" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full flex flex-col lg:grid lg:grid-cols-[1fr_400px] gap-6 max-w-6xl mx-auto min-h-[600px]">
              
              <section className="bg-black border-4 border-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.2)] relative flex items-center justify-center overflow-hidden min-h-[40vh] w-full">
                <span className="absolute top-4 right-4 bg-[#2563eb] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider z-10">
                  IA Enhanced Ready
                </span>
                <img src={enhancedImage || originalImage!} alt="Preview" className="w-full h-full object-cover opacity-90" />
              </section>

              <aside className="bg-white border-2 border-black rounded-xl p-6 flex flex-col h-full overflow-y-auto">
                <h2 className="text-xl font-bold mb-6 uppercase text-black">Modo {mode === 'simple' ? 'Simples' : 'Avançado'}</h2>
                
                {mode === 'simple' && (
                  <div className="flex flex-col flex-1">
                    <ConfigField label="Cabelo & Estilo" value={simpleConfig.hairStyle} onChange={(v) => updateConfig('hairStyle', v)} colorValue={simpleConfig.hairColor} onColorChange={(v) => updateConfig('hairColor', v)}
                      options={['Natural', 'Curto', 'Longo e liso', 'Cacheado volumoso', 'Afro', 'Pixie cut', 'Tranças', 'Penteado Coque', 'Cabelo Ondulado', 'Buzzcut']} />

                    <ConfigField label="Sombra de Olhos" value={simpleConfig.eyeshadow} onChange={(v) => updateConfig('eyeshadow', v)} colorValue={simpleConfig.eyeshadowColor} onColorChange={(v) => updateConfig('eyeshadowColor', v)}
                      options={['Nenhuma', 'Natural', 'Esfumada Dramática', 'Sombra com Glitter', 'Cut Crease', 'Sombra Neon', 'Sombra Metálica']} />
                    
                    <ConfigField label="Batom & Acabamento" value={simpleConfig.lipstick} onChange={(v) => updateConfig('lipstick', v)} colorValue={simpleConfig.lipstickColor} onColorChange={(v) => updateConfig('lipstickColor', v)}
                      options={['Natural', 'Matte Aveludado', 'Gloss Espelhado', 'Satin Hidratante', 'Lip Tint Soft', 'Batom Metálico']} />
                    
                    <ConfigField label="Blush & Contorno" value={simpleConfig.blush} onChange={(v) => updateConfig('blush', v)} colorValue={simpleConfig.blushColor} onColorChange={(v) => updateConfig('blushColor', v)}
                      options={['Nenhum', 'Sun-kissed Glow', 'Sculpted Definition', 'Dolly Pink Flush', 'Iluminado Radiante']} />
                  </div>
                )}

                {mode === 'advanced' && (
                  <div className="flex flex-col flex-1 gap-4">
                    <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563]">Descreva o visual desejado</label>
                    <textarea 
                      value={advancedPrompt} 
                      onChange={(e) => setAdvancedPrompt(e.target.value)}
                      placeholder="Ex: Cabelo curto platinado com ondas soltas. Maquiagem esfumada preta nos olhos..."
                      className="w-full flex-1 min-h-[150px] bg-[#fdf2f8] border border-black rounded p-3 text-[0.875rem] focus:outline-none resize-none"
                    />
                    <button onClick={improvePrompt} className="w-full py-2 bg-white text-[#2563eb] rounded font-semibold border-2 border-[#1e3a8a] shadow-sm transition-transform hover:-translate-y-1 flex items-center justify-center gap-2 text-sm uppercase">
                      <Sparkles className="w-4 h-4" />
                      Melhorar Prompt
                    </button>
                  </div>
                )}

                <div className="mt-8 pt-4 border-t border-gray-200 flex flex-col gap-3">
                  <button onClick={executeMagic} className="w-full bg-[#2563eb] text-white py-3 px-6 rounded-lg font-semibold border-2 border-[#1e3a8a] shadow-sm transition-transform hover:-translate-y-1">
                    Fazer a mágica
                  </button>
                  <button onClick={() => setStep('mode_select')} className="w-full bg-transparent border-none text-black underline text-xs font-bold uppercase py-2 hover:text-gray-700 cursor-pointer">
                    Trocar Modo
                  </button>
                </div>
              </aside>
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20 gap-8">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-[#f9a8d4] border-t-[#2563eb] rounded-full animate-spin"></div>
                <Sparkles className="w-6 h-6 text-[#2563eb] animate-pulse" />
              </div>
              <p className="text-xl font-bold uppercase text-black tracking-widest">{loadingText}</p>
            </motion.div>
          )}

          {step === 'result' && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
              <div className="w-full flex justify-center items-center">
                <h2 className="text-2xl font-extrabold uppercase text-black tracking-widest">Resultado</h2>
              </div>
              <div className="relative w-full aspect-[3/4] bg-black border-4 border-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.2)] overflow-hidden">
                <img src={resultImage!} alt="Resultado da Mágica" className="w-full h-full object-cover" />
              </div>
              
              <div className="flex gap-4 w-full pt-4">
                <button onClick={() => setStep('configure')} className="flex-1 py-3 bg-white text-black rounded-lg font-semibold border-2 border-black shadow-sm transition-transform hover:-translate-y-1">
                  Voltar
                </button>
                <a href={resultImage!} download="beauty-studio-magic.jpg" onClick={() => playSound('click')} className="flex-1 py-3 bg-[#2563eb] text-white rounded-lg font-semibold border-2 border-[#1e3a8a] shadow-sm transition-transform hover:-translate-y-1 flex items-center justify-center gap-2 text-center">
                  <Download className="w-5 h-5" />
                  Baixar Resultado
                </a>
              </div>
              <button onClick={() => setStep('home')} className="bg-transparent border-none text-black underline text-sm font-bold uppercase py-2 hover:text-gray-700 cursor-pointer mt-2">
                Começar Novamente
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

function ConfigField({ label, options, value, onChange, colorValue, onColorChange }: {
  label: string, 
  options: string[], 
  value: string, 
  onChange: (v: string) => void,
  colorValue: string,
  onColorChange: (c: string) => void
}) {
  return (
    <div className="mb-5">
      <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 border border-black p-2 rounded text-[0.875rem] bg-[#fdf2f8] focus:outline-none appearance-none font-medium text-black">
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <div className="w-8 h-8 rounded-full border border-black relative overflow-hidden flex-shrink-0 cursor-pointer shadow-sm" style={{ backgroundColor: colorValue }}>
          <input type="color" value={colorValue} onChange={(e) => onColorChange(e.target.value)} className="opacity-0 absolute inset-0 w-[200%] h-[200%] top-[-50%] left-[-50%] cursor-pointer" />
        </div>
      </div>
    </div>
  );
}

