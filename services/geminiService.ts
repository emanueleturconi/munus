
import { GoogleGenAI, Type } from "@google/genai";
import { JobRequest, Professional, JobClarification } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const getJobClarifications = async (description: string): Promise<JobAnalysisResult> => {
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

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return { questions: [], suggestedBudget: { min: 50, max: 200 } };
  }
};

export const refineBudget = async (description: string, clarifications: JobClarification[]): Promise<{min: number, max: number}> => {
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
    return JSON.parse(response.text);
  } catch (error) {
    return { min: 50, max: 200 };
  }
};

export const getSmartMatches = async (request: JobRequest, professionals: Professional[]): Promise<string[]> => {
  try {
    const prompt = `
      Seleziona i migliori professionisti per un intervento a: "${request.city || 'Località non specificata'}"
      Descrizione: "${request.description}"
      Budget: ${request.budgetRange.min}€ - ${request.budgetRange.max}€
      
      Professionisti (considera anche la sede del professionista e il suo raggio d'azione rispetto alla città dell'intervento):
      ${professionals.map(p => `ID: ${p.id}, Nome: ${p.name}, Sede: ${p.location.address}, Radius: ${p.workingRadius}km, Rate: ${p.hourlyRate.min}-${p.hourlyRate.max}€`).join('\n')}
      
      Restituisci solo gli ID dei professionisti che sono geograficamente compatibili o i migliori per competenza.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["recommendedIds"]
        }
      }
    });
    return JSON.parse(response.text).recommendedIds;
  } catch (error) {
    return professionals.slice(0, 3).map(p => p.id);
  }
};

export const optimizeProfessionalProfile = async (data: Partial<Professional>): Promise<{bio: string, cvSummary: string}> => {
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

    return JSON.parse(response.text);
  } catch (error) {
    return { 
      bio: data.bio || "Professionista esperto nel settore.", 
      cvSummary: "Certificazioni e competenze verificate dal network." 
    };
  }
};
