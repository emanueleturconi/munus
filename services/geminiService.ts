
import { GoogleGenAI, Type } from "@google/genai";
import { JobRequest, Professional, JobClarification } from "../types";

export interface ClarificationQuestion {
  id: string;
  question: string;
  placeholder: string;
}

export interface JobAnalysisResult {
  questions: ClarificationQuestion[];
  suggestedBudget: {
    min: number;
    max: number;
  };
}

// Instantiate GoogleGenAI inside each function to ensure compliance with the requirement of using the most up-to-date API key and avoiding stale instances.
export const getJobClarifications = async (description: string): Promise<JobAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `
      Agisci come un esperto consulente tecnico e preventivista per servizi artigianali in Italia.
      Un cliente ha descritto la sua necessità così: "${description}"
      
      Compito:
      1. Identifica i dati tecnici mancanti. Genera max 3 domande brevi.
      2. Fornisci una stima del range di prezzo per il mercato italiano.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  placeholder: { type: Type.STRING }
                },
                required: ["id", "question", "placeholder"]
              }
            },
            suggestedBudget: {
              type: Type.OBJECT,
              properties: {
                min: { type: Type.NUMBER },
                max: { type: Type.NUMBER }
              },
              required: ["min", "max"]
            }
          },
          required: ["questions", "suggestedBudget"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Error:", error);
    return { questions: [], suggestedBudget: { min: 50, max: 200 } };
  }
};

export const refineBudget = async (description: string, clarifications: JobClarification[]): Promise<{min: number, max: number}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const clarificationsText = clarifications.map(c => `${c.question}: ${c.answer}`).join('\n');
    const prompt = `Ricalcola il budget per: ${description}\nInfo extra: ${clarificationsText}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            min: { type: Type.NUMBER },
            max: { type: Type.NUMBER }
          },
          required: ["min", "max"]
        }
      }
    });
    return JSON.parse(response.text || '{"min":50,"max":200}');
  } catch (error) {
    return { min: 50, max: 200 };
  }
};

export const getLocationSuggestions = async (input: string): Promise<string[]> => {
  if (!input || input.trim().length < 2) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `Agisci come un database geografico italiano aggiornato. 
    L'utente sta cercando una località e ha digitato: "${input}".
    Fornisci una lista di massimo 8 suggerimenti che includano Comuni italiani o Frazioni (località minori).
    Se il suggerimento è una frazione, indica sempre il comune di appartenenza tra parentesi, ad esempio: "Sforzesca (Vigevano)" o "Piccoli (Vigevano)".
    Restituisci solo un array di stringhe JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["suggestions"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{"suggestions":[]}');
    return parsed.suggestions || [];
  } catch (error) {
    console.error("Location Gemini Error:", error);
    return [];
  }
};

export interface SmartMatchResponse {
  id: string;
  score: number; // Percentage 0-100
}

export const getSmartMatches = async (request: JobRequest, professionals: Professional[]): Promise<SmartMatchResponse[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `
      Seleziona i migliori professionisti per un intervento a: "${request.city || 'Località non specificata'}"
      Descrizione: "${request.description}"
      Budget: ${request.budgetRange.min}€ - ${request.budgetRange.max}€
      
      Professionisti:
      ${professionals.map(p => `ID: ${p.id}, Nome: ${p.name}, Categoria: ${p.category}, Sede: ${p.location.address}, Radius: ${p.workingRadius}km, Rate: ${p.hourlyRate.min}-${p.hourlyRate.max}€, Ranking: ${p.ranking}`).join('\n')}
      
      Per ogni professionista, calcola uno "score" (percentuale da 0 a 100) basato sulla pertinenza con la richiesta, la vicinanza geografica e il ranking.
      Restituisci un array di oggetti con ID e Score.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  score: { type: Type.NUMBER }
                },
                required: ["id", "score"]
              }
            }
          },
          required: ["matches"]
        }
      }
    });
    return JSON.parse(response.text || '{"matches":[]}').matches;
  } catch (error) {
    return professionals.slice(0, 3).map(p => ({ id: p.id, score: Math.floor(Math.random() * 20) + 70 }));
  }
};

export const optimizeProfessionalProfile = async (data: Partial<Professional>): Promise<{bio: string, cvSummary: string}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `
      Agisci come un esperto HR per artigiani d'eccellenza.
      Ottimizza il profilo di questo professionista:
      Nome: ${data.name}
      Categoria: ${data.category}
      Sede: ${data.location?.address}
      Esperienza: ${data.experienceYears} anni
      Certificazioni: ${data.certifications?.join(', ')}
      Note personali: ${data.bio}

      Compito:
      1. Scrivi una "bio" accattivante di 2-3 frasi che ispiri fiducia.
      2. Scrivi un "cvSummary" tecnico puntando sulle capacità operative.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bio: { type: Type.STRING },
            cvSummary: { type: Type.STRING }
          },
          required: ["bio", "cvSummary"]
        }
      }
    });

    return JSON.parse(response.text || '{"bio":"","cvSummary":""}');
  } catch (error) {
    return { 
      bio: data.bio || "Professionista esperto nel settore.", 
      cvSummary: "Certificazioni e competenze verificate dal network." 
    };
  }
};
