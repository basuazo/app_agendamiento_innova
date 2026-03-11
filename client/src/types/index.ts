export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REJECTED';
export type BookingPurpose = 'LEARN' | 'PRODUCE' | 'DESIGN' | 'REUNION';
export type CommentTag = 'GENERAL' | 'MACHINE_ISSUE' | 'ORDER' | 'CLEANING';
export type CompanionRelation = 'CUIDADOS' | 'AMISTAD' | 'OTRO';
export type ResourceAvailabilityStatus = 'available' | 'booked' | 'blocked';
export type CertReqStatus = 'PENDING' | 'SCHEDULED' | 'APPROVED' | 'REJECTED';

export interface Category {
  id: string;
  name: string;
  slug: string;   // e.g. "RECTA_CASERA" — usado para lógica de negocio
  color: string;  // hex color
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Space {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  organization?: string | null;
  role: Role;
  spaceId?: string | null;
  isVerified?: boolean;
  createdAt: string;
}

export interface Resource {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  category: Category;
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
  resource: { id: string; name: string; category: Category };
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
  categoryId: string;
  category: Category;
  certifiedAt: string;
  certifiedById: string;
  notes?: string;
  certifier?: { name: string };
  user?: { id: string; name: string; email: string };
}

export interface CertificationRequest {
  id: string;
  userId: string;
  categoryId: string;
  category: Category;
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
