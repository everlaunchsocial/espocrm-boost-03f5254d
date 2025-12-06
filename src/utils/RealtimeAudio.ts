import { supabase } from "@/integrations/supabase/client";

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      console.log('Audio recording started');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    console.log('Audio recording stopped');
  }
}

export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binary);
};

interface BusinessInfo {
  businessName?: string;
  services?: string[];
  description?: string;
  phones?: string[];
  emails?: string[];
  hours?: string;
  address?: string;
}

export interface ContactInfoRequest {
  prospect_name: string;
  phone_number?: string;
  email?: string;
  reason?: string;
  callId: string;
}

export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private onMessage: (message: any) => void;
  private onSpeakingChange: (speaking: boolean) => void;
  private onTranscript: (text: string, isFinal: boolean) => void;
  private onContactInfoRequest: ((request: ContactInfoRequest) => void) | null = null;
  private businessInfo: BusinessInfo | null = null;
  private pendingToolCalls: Map<string, any> = new Map();

  constructor(
    onMessage: (message: any) => void,
    onSpeakingChange: (speaking: boolean) => void,
    onTranscript: (text: string, isFinal: boolean) => void,
    onContactInfoRequest?: (request: ContactInfoRequest) => void
  ) {
    this.onMessage = onMessage;
    this.onSpeakingChange = onSpeakingChange;
    this.onTranscript = onTranscript;
    this.onContactInfoRequest = onContactInfoRequest || null;
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
  }

  async init(ephemeralKey: string, businessInfo?: BusinessInfo) {
    try {
      console.log('Initializing WebRTC connection...');
      this.businessInfo = businessInfo || null;

      // Create peer connection
      this.pc = new RTCPeerConnection();

      // Set up remote audio
      this.pc.ontrack = (e) => {
        console.log('Received audio track');
        this.audioEl.srcObject = e.streams[0];
      };

      // Add local audio track
      const ms = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      this.pc.addTrack(ms.getTracks()[0]);

      // Set up data channel
      this.dc = this.pc.createDataChannel("oai-events");
      
      this.dc.addEventListener("open", () => {
        console.log('Data channel opened');
        
        // Wait 2 seconds then trigger the AI to start speaking its greeting
        setTimeout(() => {
          if (this.dc && this.dc.readyState === 'open') {
            console.log('Triggering AI greeting...');
            this.dc.send(JSON.stringify({ type: 'response.create' }));
          }
        }, 2000);
      });

      this.dc.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        console.log("Received event:", event.type);
        this.handleEvent(event);
      });

      // Create and set local description
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      console.log('Connecting to OpenAI Realtime API...');
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        throw new Error(`Failed to connect: ${sdpResponse.status} - ${errorText}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };

      await this.pc.setRemoteDescription(answer);
      console.log("WebRTC connection established");

    } catch (error) {
      console.error("Error initializing chat:", error);
      throw error;
    }
  }

  private async handleEvent(event: any) {
    this.onMessage(event);

    switch (event.type) {
      case 'response.audio.delta':
        this.onSpeakingChange(true);
        break;
      case 'response.audio.done':
        this.onSpeakingChange(false);
        break;
      case 'response.audio_transcript.delta':
        this.onTranscript(event.delta, false);
        break;
      case 'response.audio_transcript.done':
        this.onTranscript(event.transcript, true);
        break;
      case 'input_audio_buffer.speech_started':
        console.log('User started speaking');
        break;
      case 'input_audio_buffer.speech_stopped':
        console.log('User stopped speaking');
        break;
      case 'conversation.item.input_audio_transcription.completed':
        console.log('User said:', event.transcript);
        break;
      
      // Handle tool calls
      case 'response.function_call_arguments.delta':
        // Accumulate function call arguments
        const callId = event.call_id;
        if (!this.pendingToolCalls.has(callId)) {
          this.pendingToolCalls.set(callId, { 
            name: event.name || '', 
            arguments: '' 
          });
        }
        const pending = this.pendingToolCalls.get(callId)!;
        if (event.name) pending.name = event.name;
        pending.arguments += event.delta || '';
        break;

      case 'response.function_call_arguments.done':
        // Execute the tool call
        console.log('Function call complete:', event.call_id, event.name, event.arguments);
        await this.executeToolCall(event.call_id, event.name, event.arguments);
        this.pendingToolCalls.delete(event.call_id);
        break;

      case 'error':
        console.error('Realtime API error:', event.error);
        break;
    }
  }

  private async executeToolCall(callId: string, toolName: string, argsString: string) {
    try {
      console.log(`Executing tool: ${toolName}`);
      
      let args: any;
      try {
        args = JSON.parse(argsString);
      } catch (e) {
        console.error('Failed to parse tool arguments:', argsString);
        args = {};
      }

      // Handle collect_contact_info locally - trigger UI form
      if (toolName === 'collect_contact_info') {
        console.log('Triggering contact info collection form');
        if (this.onContactInfoRequest) {
          this.onContactInfoRequest({
            prospect_name: args.prospect_name || '',
            phone_number: args.phone_number,
            email: args.email,
            reason: args.reason,
            callId: callId
          });
        }
        // Don't send tool result yet - wait for form submission
        return;
      }

      // Call the edge function to execute other tools
      const { data, error } = await supabase.functions.invoke('voice-tool-handler', {
        body: {
          tool_name: toolName,
          arguments: args,
          businessInfo: this.businessInfo
        }
      });

      if (error) {
        console.error('Tool execution error:', error);
        this.sendToolResult(callId, { error: error.message });
        return;
      }

      console.log('Tool result:', data);
      this.sendToolResult(callId, data.result);

    } catch (error) {
      console.error('Error executing tool:', error);
      this.sendToolResult(callId, { error: 'Failed to execute tool' });
    }
  }

  // Public method to send tool result from outside (for contact form submission)
  public submitContactInfo(callId: string, contactInfo: { email: string; phone: string }) {
    console.log('Submitting contact info:', contactInfo);
    this.sendToolResult(callId, {
      success: true,
      message: 'Contact info collected successfully',
      email: contactInfo.email,
      phone: contactInfo.phone
    });
  }

  private sendToolResult(callId: string, result: any) {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.error('Data channel not ready for tool result');
      return;
    }

    // Send the tool result back to the conversation
    const toolResultEvent = {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result)
      }
    };

    this.dc.send(JSON.stringify(toolResultEvent));
    
    // Trigger a response after the tool result
    this.dc.send(JSON.stringify({ type: 'response.create' }));
    
    console.log('Tool result sent:', callId);
  }

  sendTextMessage(text: string) {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({ type: 'response.create' }));
  }

  disconnect() {
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.audioEl.srcObject) {
      (this.audioEl.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      this.audioEl.srcObject = null;
    }
    this.pendingToolCalls.clear();
    console.log('Disconnected from realtime API');
  }
}
