// ElevenLabs Conversational AI WebSocket Client
// Uses raw PCM 16-bit audio at 16kHz as required by ElevenLabs

export class ElevenLabsChat {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private playbackContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onMessage: (message: any) => void;
  private onSpeakingChange: (speaking: boolean) => void;
  private onTranscript: (text: string, isFinal: boolean) => void;

  constructor(
    onMessage: (message: any) => void,
    onSpeakingChange: (speaking: boolean) => void,
    onTranscript: (text: string, isFinal: boolean) => void
  ) {
    this.onMessage = onMessage;
    this.onSpeakingChange = onSpeakingChange;
    this.onTranscript = onTranscript;
  }

  async init(signedUrl: string) {
    try {
      console.log('Initializing ElevenLabs WebSocket connection...');

      // Initialize audio contexts - 16kHz for capture, 44.1kHz for playback
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.playbackContext = new AudioContext();

      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Connect to ElevenLabs WebSocket
      this.ws = new WebSocket(signedUrl);

      this.ws.onopen = () => {
        console.log('ElevenLabs WebSocket connected');
        this.startAudioCapture();
      };

      this.ws.onmessage = async (event) => {
        try {
          // Handle both text and binary messages
          if (event.data instanceof Blob) {
            // Binary audio data from ElevenLabs
            const arrayBuffer = await event.data.arrayBuffer();
            await this.playAudio(arrayBuffer);
          } else {
            // JSON event
            const data = JSON.parse(event.data);
            this.handleEvent(data);
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('ElevenLabs WebSocket error:', error);
      };

      this.ws.onclose = (event) => {
        console.log('ElevenLabs WebSocket closed:', event.code, event.reason);
        this.cleanup();
      };

      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
        
        const checkConnection = () => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearTimeout(timeout);
            resolve();
          } else if (this.ws?.readyState === WebSocket.CLOSED) {
            clearTimeout(timeout);
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        
        checkConnection();
      });

      console.log('ElevenLabs connection established');
    } catch (error) {
      console.error('Error initializing ElevenLabs chat:', error);
      this.cleanup();
      throw error;
    }
  }

  private startAudioCapture() {
    if (!this.mediaStream || !this.ws || !this.audioContext) return;

    try {
      // Create audio processing pipeline for PCM capture
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Use ScriptProcessor to get raw PCM audio data
      // Buffer size of 4096 gives ~256ms chunks at 16kHz
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.scriptProcessor.onaudioprocess = (e) => {
        if (this.ws?.readyState !== WebSocket.OPEN) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 to Int16 PCM
        const pcmData = this.float32ToPCM16(inputData);
        
        // Convert to base64
        const base64Audio = this.arrayBufferToBase64(new Uint8Array(pcmData.buffer));
        
        // Send to ElevenLabs in the correct format
        this.ws.send(JSON.stringify({
          user_audio_chunk: base64Audio,
        }));
      };
      
      this.source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
      
      console.log('Audio capture started (PCM 16-bit @ 16kHz)');
    } catch (error) {
      console.error('Error starting audio capture:', error);
    }
  }

  private float32ToPCM16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp and convert
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  private arrayBufferToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000; // 32KB chunks to avoid call stack issues
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  }

  private handleEvent(event: any) {
    console.log('ElevenLabs event:', event.type || event);
    this.onMessage(event);

    switch (event.type) {
      case 'conversation_initiation_metadata':
        console.log('Conversation initialized:', event.conversation_id);
        break;

      case 'agent_response':
        // Agent text response
        if (event.agent_response) {
          this.onTranscript(event.agent_response, true);
        }
        break;

      case 'agent_response_correction':
        // Updated/corrected response
        if (event.agent_response_correction) {
          this.onTranscript(event.agent_response_correction, true);
        }
        break;

      case 'user_transcript':
        // User's speech transcribed
        console.log('User said:', event.user_transcript);
        break;

      case 'audio':
        // Audio is being generated
        this.onSpeakingChange(true);
        break;

      case 'audio_end':
        this.onSpeakingChange(false);
        break;

      case 'interruption':
        console.log('User interrupted');
        this.onSpeakingChange(false);
        break;

      case 'ping':
        // Respond to ping with pong
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'pong', event_id: event.event_id }));
        }
        break;

      case 'error':
        console.error('ElevenLabs error:', event.message || event);
        break;
    }
  }

  private async playAudio(arrayBuffer: ArrayBuffer) {
    if (!this.playbackContext) return;

    try {
      this.onSpeakingChange(true);
      
      // Decode audio data
      const audioBuffer = await this.playbackContext.decodeAudioData(arrayBuffer.slice(0));
      this.audioQueue.push(audioBuffer);
      
      if (!this.isPlaying) {
        this.playNextInQueue();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  private playNextInQueue() {
    if (!this.playbackContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.onSpeakingChange(false);
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;
    
    const source = this.playbackContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.playbackContext.destination);
    
    source.onended = () => {
      this.playNextInQueue();
    };
    
    source.start(0);
  }

  sendTextMessage(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not ready');
    }

    // Send text input to ElevenLabs
    this.ws.send(JSON.stringify({
      text: text,
    }));
  }

  disconnect() {
    this.cleanup();
    console.log('Disconnected from ElevenLabs');
  }

  private cleanup() {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.playbackContext) {
      this.playbackContext.close();
      this.playbackContext = null;
    }

    this.audioQueue = [];
    this.isPlaying = false;
  }
}
