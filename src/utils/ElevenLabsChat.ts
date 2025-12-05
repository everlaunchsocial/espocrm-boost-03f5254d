// ElevenLabs Conversational AI WebSocket Client
// Mirrors the interface of RealtimeChat for OpenAI

export class ElevenLabsChat {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
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

      // Initialize audio context
      this.audioContext = new AudioContext({ sampleRate: 16000 });

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
            // Binary audio data
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
    if (!this.mediaStream || !this.ws) return;

    // Use MediaRecorder to capture audio and send to WebSocket
    const options = { mimeType: 'audio/webm;codecs=opus' };
    
    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
    } catch (e) {
      // Fallback for browsers that don't support opus
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
    }

    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
        // Convert blob to base64 and send as user audio input
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result && this.ws?.readyState === WebSocket.OPEN) {
            const base64 = (reader.result as string).split(',')[1];
            this.ws.send(JSON.stringify({
              user_audio_chunk: base64,
            }));
          }
        };
        reader.readAsDataURL(event.data);
      }
    };

    // Send audio in small chunks for real-time processing
    this.mediaRecorder.start(100); // 100ms chunks
    console.log('Audio capture started');
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
    if (!this.audioContext) return;

    try {
      this.onSpeakingChange(true);
      
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      this.audioQueue.push(audioBuffer);
      
      if (!this.isPlaying) {
        this.playNextInQueue();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  private playNextInQueue() {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.onSpeakingChange(false);
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    
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
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
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

    this.audioQueue = [];
    this.isPlaying = false;
  }
}
