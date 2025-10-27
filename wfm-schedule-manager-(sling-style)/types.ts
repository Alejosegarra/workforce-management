import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';

export interface User extends SupabaseUser {
  role: 'admin' | 'empleado';
}

export interface Session extends SupabaseSession {
  user: User;
}

export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  horario_apertura: string;
  horario_cierre: string;
}

export interface Posicion {
  id: number;
  nombre_posicion: string;
  descripcion: string;
}

export interface Empleado {
  id: string; // UUID from auth.users
  nombre_completo: string;
  email: string;
  fk_posicion_principal: number;
  fk_sucursal_base: number;
  horas_contrato_semanales: number;
  role: 'admin' | 'empleado';
  posicion?: Posicion; // Joined data
  sucursal?: Sucursal; // Joined data
}

export interface Turno {
  id: number;
  fecha: string; // YYYY-MM-DD
  fk_empleado: string | null;
  fk_sucursal_asignada: number;
  fk_posicion_requerida: number;
  hora_inicio: string; // HH:mm
  hora_fin: string; // HH:mm
  notas_turno: string | null;
  empleado?: Empleado | null; // Joined data
  posicion?: Posicion; // Joined data
  sucursal?: Sucursal; // Joined data
}

export type EstadoCambio = 'Pendiente' | 'Aprobado' | 'Rechazado';

export interface CambioPendiente {
  id: number;
  fk_turno_original: number;
  fk_turno_solicitado?: number; // For direct swaps
  fk_empleado_solicitante: string;
  fk_empleado_destino: string;
  estado: EstadoCambio;
  turno?: Turno;
  turno_solicitado?: Turno;
  solicitante?: Empleado;
  destino?: Empleado;
}

export interface HorasSemanales {
    fk_empleado: string;
    total_horas: number;
}

export type EstadoAusencia = 'Pendiente' | 'Aprobado' | 'Rechazado';
export type TipoAusencia = 'Vacaciones' | 'Enfermedad' | 'Personal';

export interface Ausencia {
    id: number;
    fk_empleado: string;
    tipo: TipoAusencia;
    fecha_inicio: string; // YYYY-MM-DD
    fecha_fin: string; // YYYY-DD-MM
    estado: EstadoAusencia;
    notas?: string;
    empleado?: Empleado; // Joined data
}

export interface TurnoPlantilla {
  id: number;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
}
