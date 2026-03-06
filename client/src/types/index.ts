export type Role = 'ADMIN' | 'USER';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REJECTED';
export type BookingPurpose = 'LEARN' | 'PRODUCE' | 'DESIGN' | 'REUNION';
export type CommentTag = 'GENERAL' | 'MACHINE_ISSUE' | 'ORDER' | 'CLEANING';
export type CompanionRelation = 'CUIDADOS' | 'AMISTAD' | 'OTRO';
export type ResourceAvailabilityStatus = 'available' | 'booked' | 'blocked';
export type CertReqStatus = 'PENDING' | 'SCHEDULED' | 'APPROVED' | 'REJECTED';

export type ResourceCategory =
  | 'RECTA_CASERA'
  | 'OVERLOCK_CASERA'
  | 'COLLERETERA'
  | 'BORDADORA'
  | 'IMPRESORA_SUBLIMACION'
  | 'PLOTTER_CORTE'
  | 'PLANCHA_SUBLIMACION'
  | 'INDUSTRIAL'
  | 'PLANCHA_VAPOR'
  | 'MESON_CORTE'
  | 'ESPACIO_REUNION';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isVerified?: boolean;
  createdAt: string;
}

export interface Resource {
  id: string;
  name: string;
  description?: string;
  category: ResourceCategory;
  requiresCertification: boolean;
  capacity: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Booking {
  id: string;
  userId: string;
  resourceId: string;
  startTime: string;
  endTime: string;
  notes?: string;
  purpose: BookingPurpose;
  produceItem?: string;
  produceQty?: number;
  quantity: number;
  isPrivate?: boolean;
  attendees: number;
  companionRelation?: CompanionRelation;
  status: BookingStatus;
  googleCalendarEventId?: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  resource: { id: string; name: string; category: ResourceCategory };
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  tag: CommentTag;
  imageUrl?: string;
  createdAt: string;
  user: { id: string; name: string };
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ResourceAvailability {
  [resourceId: string]: {
    status: ResourceAvailabilityStatus;
    reason?: string;
    availableCapacity?: number;
  };
}

export interface TrainingExemption {
  id: string;
  resourceId: string;
  resource: { id: string; name: string };
}

export interface Training {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  createdBy: string;
  createdAt: string;
  exemptions: TrainingExemption[];
}

export interface Certification {
  id: string;
  userId: string;
  resourceCategory: ResourceCategory;
  certifiedAt: string;
  certifiedById: string;
  notes?: string;
  certifier?: { name: string };
  user?: { id: string; name: string; email: string };
}

export interface CertificationRequest {
  id: string;
  userId: string;
  resourceCategory: ResourceCategory;
  status: CertReqStatus;
  scheduledDate?: string;
  notes?: string;
  resolvedAt?: string;
  createdAt: string;
  user?: { id: string; name: string; email: string };
}

export interface BusinessHours {
  id: string;
  dayOfWeek: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  isOpen: boolean;
  openTime: string;  // "09:00"
  closeTime: string; // "17:00"
  updatedAt: string;
}
