export interface Hotel {
  hotelId: string;
  name: string;
  price: number;
  supplier: "SupplierA" | "SupplierB";
}

export interface SearchRequest {
  city: string;
  checkIn: string;
  checkOut: string;
  scenario?: string;
}

export interface SupplierStatus {
  supplier: "SupplierA" | "SupplierB";
  status:
    | "SUCCESS"
    | "FAILED"
    | "TIMEOUT"
    | "EMPTY"
    | "RUNNING";
  hotels: Hotel[];
  error?: string;
}

export type WorkflowStepStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "TIMEOUT";

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: WorkflowStepStatus;
}

export interface SearchResult {
  hotel: Hotel | null;
  message: string;
  search: SearchRequest;
  suppliers: SupplierStatus[];
  workflowSteps: WorkflowStep[];
}