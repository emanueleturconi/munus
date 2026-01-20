
import { Category, Professional } from './types';

export const MOCK_PROFESSIONALS: Professional[] = [
  {
    id: '1',
    name: 'Mario Rossi',
    category: Category.PLUMBER,
    bio: 'Specialista in impianti idraulici civili e riparazioni urgenti. Oltre 15 anni di esperienza.',
    phone: '+39 340 123 4567',
    email: 'mario.rossi@example.com',
    location: { lat: 45.4642, lng: 9.1900, address: 'Milano, Centro' },
    workingRadius: 30,
    hourlyRate: { min: 40, max: 60 },
    certifications: ['Patentino F-GAS', 'Abilitazione Impianti Termici'],
    experienceYears: 15,
    ranking: 4.8,
    avatar: 'https://picsum.photos/seed/mario/200',
    cvSummary: 'Diplomato tecnico, certificazione impianti a gas, specialista caldaie.',
    reviews: [
      { id: 'r1', clientId: 'c1', clientName: 'Anna B.', jobDescription: 'Riparazione perdita occulta bagno', rating: 5, comment: 'Lavoro impeccabile e molto veloce.', date: '2023-10-12', isConfirmed: true }
    ]
  },
  {
    id: '2',
    name: 'Luca Bianchi',
    category: Category.ELECTRICIAN,
    bio: 'Impianti domotici e certificazioni elettriche. Massima precisione.',
    phone: '+39 347 765 4321',
    email: 'luca.bianchi@example.com',
    location: { lat: 45.4742, lng: 9.2100, address: 'Milano, Loreto' },
    workingRadius: 50,
    hourlyRate: { min: 35, max: 55 },
    certifications: ['Esperto KNX', 'Abilitazione Lettera A/B'],
    experienceYears: 8,
    ranking: 4.5,
    avatar: 'https://picsum.photos/seed/luca/200',
    cvSummary: 'Esperto in automazione residenziale e sistemi di sicurezza.',
    reviews: [
      { id: 'r3', clientId: 'c3', clientName: 'Sofia G.', jobDescription: 'Adeguamento impianto elettrico a norma', rating: 5, comment: 'Molto bravo e onesto.', date: '2023-09-20', isConfirmed: true }
    ]
  }
];
