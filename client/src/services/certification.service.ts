import api from './api';
import { Certification, CertificationRequest, ResourceCategory } from '../types';

export const certificationService = {
  getMyCertifications: () =>
    api.get<Certification[]>('/certifications/mine').then((r) => r.data),

  getMyRequests: () =>
    api.get<CertificationRequest[]>('/certifications/my-requests').then((r) => r.data),

  requestCertification: (resourceCategory: ResourceCategory) =>
    api.post<CertificationRequest>('/certifications/request', { resourceCategory }).then((r) => r.data),

  cancelMyRequest: (id: string) =>
    api.delete(`/certifications/my-requests/${id}`).then((r) => r.data),

  // Admin
  getAllRequests: (status?: string) =>
    api.get<CertificationRequest[]>('/admin/certifications/requests', { params: status ? { status } : undefined }).then((r) => r.data),

  scheduleSession: (requestIds: string[], scheduledDate: string) =>
    api.patch<CertificationRequest[]>('/admin/certifications/schedule', { requestIds, scheduledDate }).then((r) => r.data),

  resolveRequest: (id: string, status: 'APPROVED' | 'REJECTED', notes?: string) =>
    api.patch<CertificationRequest>(`/admin/certifications/requests/${id}/resolve`, { status, notes }).then((r) => r.data),

  getAllCertifications: () =>
    api.get<Certification[]>('/admin/certifications').then((r) => r.data),

  revokeCertification: (id: string) =>
    api.delete(`/admin/certifications/${id}`).then((r) => r.data),
};
