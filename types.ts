
export enum Category {
  PLUMBER = 'Idraulico',
  ELECTRICIAN = 'Elettricista',
  MASON = 'Muratore',
  PAINTER = 'Imbianchino',
  GARDENER = 'Giardiniere'
}

export enum UserRole {
  CLIENT = 'CLIENT',
  PROFESSIONAL = 'PROFESSIONAL'
}

export enum RequestStep {
  FORM = 'FORM',
  CLARIFY = 'CLARIFY',
  SELECT_PROS = 'SELECT_PROS',
  WAITING_RESPONSES = 'WAITING_RESPONSES',
  FINAL_MATCHES = 'FINAL_MATCHES'
}

export enum JobStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED'
}

export interface Review {
  id: string;
  clientId: string;
  clientName: string;
  jobDescription: string;
  rating: number;
  comment: string;
  date: string;
  isConfirmed: boolean;
}

export interface Professional {
  id: string;
  name: string;
  category: Category;
  bio: string;
  phone: string;
  email: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  workingRadius: number; // in km
  hourlyRate: {
    min: number;
    max: number;
  };
  certifications: string[];
  experienceYears: number;
  ranking: number;
  reviews: Review[];
  cvSummary: string;
  avatar: string;
}

export interface JobClarification {
  question: string;
  answer: string;
}

export interface JobRequest {
  id: string;
  clientId: string;
  clientName?: string; // Nome per passaparola
  clientAvatar?: string; // Avatar per fiducia visiva
  description: string;
  category?: Category;
  city?: string;
  budgetRange: {
    min: number;
    max: number;
  };
  selectedProIds: string[];
  acceptedProIds: string[];
  rejectedProIds?: string[];
  hiredProId?: string;
  status: JobStatus;
  createdAt: string;
  hasFeedback?: boolean;
  clarifications?: JobClarification[];
}
