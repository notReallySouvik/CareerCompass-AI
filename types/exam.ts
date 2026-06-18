export interface Exam {
  id: string;
  name: string;
  country: string;
  minAge: number;
  maxAge: number;
  education: string;
  description: string;
  detailsLoaded: boolean;
  officialUrl?: string;
}