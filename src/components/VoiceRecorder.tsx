import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Loader2, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  color: string;
  parent_id: string | null;
}

interface ProcessedNote {
  title: string;
  content: string;
  suggested_category_id: string | null;
  suggested_category_name: string | null;
  parent_category_name?: string | null;
}

interface VoiceRecorderProps {
  userId: string;
  onProcessed?: (processed: ProcessedNote, categories: Category[]) => void;
}

export function VoiceRecorder({ userId, onProcessed }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const updateAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(average / 255);
    
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processRecording();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      setAudioLevel(0);
    }
  };

  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      toast.error('No audio recorded');
      return;
    }

    setIsProcessing(true);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await base64Promise;

      const { data, error } = await supabase.functions.invoke('process-voice', {
        body: { audio: base64Audio }
      });

      if (error) throw error;

      if (data.success) {
        // Call the callback with processed data instead of saving
        onProcessed?.(data.processed, data.categories || []);
      } else {
        throw new Error(data.error || 'Failed to process voice note');
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process voice note');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative">
      {isRecording && (
        <div 
          className="absolute inset-0 rounded-full bg-primary/20 animate-pulse"
          style={{
            transform: `scale(${1 + audioLevel * 0.5})`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
      
      <Button
        type="button"
        size="sm"
        variant={isRecording ? "destructive" : "ghost"}
        disabled={isProcessing}
        onClick={isRecording ? stopRecording : startRecording}
        className={`rounded-full w-8 h-8 p-0 relative z-10 ${
          isRecording ? 'bg-destructive hover:bg-destructive/90' : ''
        }`}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isRecording ? (
          <Square className="w-3 h-3" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>
      
      {isRecording && (
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-destructive whitespace-nowrap animate-pulse">
          Recording...
        </span>
      )}
      
      {isProcessing && (
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
          Processing...
        </span>
      )}
    </div>
  );
}
