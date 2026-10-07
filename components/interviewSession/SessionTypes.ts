export interface Question {
  _id: string;
  text: string;
  answer?: string;
  analysis?: {
    score?: number;
    feedback?: string;
  };
  recording?: {
    url: string;
    key: string;
    mimeType: string;
    size: number;
    duration: number;
  };
}

export interface Interview {
  usedFallbackQuestions?: boolean;
  _id: string;
  title: string;
  description?: string;
  questions: Question[];
  status: 'draft' | 'in-progress' | 'completed' | 'evaluated';
  createdAt: string;
  updatedAt: string;
}

export interface InterviewSessionProps {
  interview: Interview;
  onInterviewUpdate: (updatedInterview: Interview) => void;
}

export interface ISpeechRecognition extends EventTarget {
  new (): ISpeechRecognition;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: ISpeechRecognitionEvent) => void;
  onerror: (event: ISpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
}

export interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    isFinal: boolean;
    [key: number]: {
      transcript: string;
    };
  }[];
}

export interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
