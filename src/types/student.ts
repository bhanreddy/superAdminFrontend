export interface Student {
  id: string;
  admission_no: string;
  created_at: string;
  status_id: number;
  status_name: string | null;
  first_name: string;
  last_name: string;
  gender_id: number;
  photo_url: string | null;
  school_name: string;
  school_id: number;
}
