import { useRef, useEffect, useCallback, useState } from 'react';

export function useAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const bgmNodesRef = useRef<{ osc: OscillatorNode, gain: GainNode }[]>([]);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);
  const noteIndexRef = useRef(0);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playClick = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }, []);

  const playChunk = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }, []);

  const playError = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(150, ctx.currentTime);
    osc2.frequency.setValueAtTime(215, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 0.3);
  }, []);

  const playFanfare = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.4);
    });
  }, []);

  const playFlip = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }, []);

  const playComposition = useCallback((grid: number[][], winner: 1 | 2 | 'draw' | null, onColumnChange: (col: number) => void, onComplete: () => void) => {
    if (!audioCtxRef.current) initAudio();
    const ctx = audioCtxRef.current!;
    const startTime = ctx.currentTime + 0.1;
    const size = grid.length;
    const colDuration = 3.0 / size; // Adjust duration based on size

    // Red (Aggressive/Minor)
    const scaleRed = [523.25, 466.16, 392.00, 349.23, 311.13, 261.63, 233.08, 196.00, 174.61, 155.56, 130.81, 116.54];
    // Blue (Calm/Major)
    const scaleBlue = [523.25, 440.00, 392.00, 329.63, 293.66, 261.63, 220.00, 196.00, 164.81, 146.83, 130.81, 110.00];

    for (let c = 0; c < size; c++) {
      const colTime = startTime + c * colDuration;
      
      setTimeout(() => {
        onColumnChange(c);
      }, Math.max(0, (colTime - ctx.currentTime) * 1000));

      for (let r = 0; r < size; r++) {
        const cell = grid[r][c];
        
        // Only play the winner's cells (or both if draw) to hear their specific pattern
        const shouldPlay = winner === 'draw' ? (cell === 1 || cell === 2) : cell === winner;
        
        if (shouldPlay) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = cell === 1 ? 'square' : 'sine';
          const scale = cell === 1 ? scaleRed : scaleBlue;
          const scaleIndex = Math.floor((r / size) * scale.length);
          osc.frequency.value = scale[scaleIndex];
          
          // Arpeggiate based on row to create a melody from the pattern
          const noteTime = colTime + (r / size) * (colDuration * 0.8);
          const noteDuration = colDuration * 0.5;
          
          gain.gain.setValueAtTime(0, noteTime);
          gain.gain.linearRampToValueAtTime(cell === 1 ? 0.04 : 0.1, noteTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + noteDuration);
          
          if (cell === 1) {
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, noteTime);
            filter.frequency.exponentialRampToValueAtTime(200, noteTime + noteDuration);
            osc.connect(filter);
            filter.connect(gain);
          } else {
            osc.connect(gain);
          }
          
          gain.connect(ctx.destination);
          
          osc.start(noteTime);
          osc.stop(noteTime + noteDuration);
        }
      }
    }

    setTimeout(() => {
      onComplete();
    }, Math.max(0, (startTime + size * colDuration - ctx.currentTime) * 1000));

  }, [initAudio]);

  const scheduleBgm = useCallback(() => {
    if (!audioCtxRef.current || !isBgmPlaying) return;
    const ctx = audioCtxRef.current;
    
    const tempo = 130;
    const secondsPerBeat = 60.0 / tempo;
    const lookahead = 25.0;
    const scheduleAheadTime = 0.1;

    const playNote = (time: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const notes = [65.41, 65.41, 77.78, 87.31];
      const freq = notes[noteIndexRef.current % notes.length];
      
      osc.type = 'square';
      osc.frequency.value = freq;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, time);
      filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);
      
      gain.gain.setValueAtTime(0.05, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(time);
      osc.stop(time + 0.2);
      
      bgmNodesRef.current.push({ osc, gain });
      if (bgmNodesRef.current.length > 10) {
        bgmNodesRef.current.shift();
      }
    };

    const scheduler = () => {
      while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
        playNote(nextNoteTimeRef.current);
        nextNoteTimeRef.current += secondsPerBeat / 2;
        noteIndexRef.current++;
      }
      if (isBgmPlaying) {
        timerIDRef.current = window.setTimeout(scheduler, lookahead);
      }
    };
    
    scheduler();
  }, [isBgmPlaying]);

  useEffect(() => {
    if (isBgmPlaying) {
      if (!audioCtxRef.current) initAudio();
      nextNoteTimeRef.current = audioCtxRef.current!.currentTime + 0.1;
      scheduleBgm();
    } else {
      if (timerIDRef.current) {
        window.clearTimeout(timerIDRef.current);
      }
    }
    return () => {
      if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
    };
  }, [isBgmPlaying, scheduleBgm, initAudio]);

  const toggleBgm = useCallback(() => {
    initAudio();
    setIsBgmPlaying(prev => !prev);
  }, [initAudio]);

  const stopBgm = useCallback(() => {
    setIsBgmPlaying(false);
  }, []);

  return { initAudio, playClick, playChunk, playError, playFanfare, playFlip, playComposition, toggleBgm, stopBgm, isBgmPlaying };
}
