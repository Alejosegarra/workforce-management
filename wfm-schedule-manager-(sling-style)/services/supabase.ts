
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Sucursal, Posicion, Empleado, Turno, CambioPendiente, HorasSemanales, EstadoCambio, Ausencia, EstadoAusencia, TurnoPlantilla } from '../types';

// Hardcoded Supabase credentials for simple deployment as requested by the user.
const supabaseUrl = 'https://kqjgkmeebskbkfxratbg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxamdrbWVlYnNrYmtmeHJhdGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjM2MzgsImV4cCI6MjA3Njg5OTYzOH0.xeyFvmqiR3yXX6HUX4socPw_6BSDFAUOh3ufPh9BmAY';

// Since credentials are now hardcoded, this is always considered configured.
export const isSupabaseConfigured = true;

// Create the Supabase client with the provided credentials.
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);


// --- API SERVICE WRAPPER ---
export const supabaseService = {
    // Auth related
    async getProfile(userId: string): Promise<Partial<Empleado> | null> {
        if (!isSupabaseConfigured) return null;
        const { data, error } = await supabase
            .from('empleados')
            .select('role')
            .eq('id', userId)
            .single();

        if (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }
        return data;
    },

    async updateAdminPassword(password: string): Promise<void> {
        const { error } = await supabase.auth.updateUser({ password });
         if (error) {
            throw new Error(error.message);
        }
    },
    
    // Email Notifications (Simulated - Supabase Edge Functions would be the real implementation)
    async sendEmailNotification(to: string, subject: string, body: string): Promise<void> {
        console.log("--- SIMULATING EMAIL (In production, use an Edge Function) ---");
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${body}`);
        console.log("-----------------------------------------------------------------");
        return Promise.resolve();
    },

    // Sucursales
    async getSucursales(): Promise<Sucursal[]> {
        const { data, error } = await supabase.from('sucursales').select('*');
        if (error) throw error;
        return data || [];
    },
    async addSucursal(sucursal: Omit<Sucursal, 'id'>): Promise<Sucursal> {
        const { data, error } = await supabase.from('sucursales').insert(sucursal).select().single();
        if (error) throw error;
        return data;
    },
    async updateSucursal(id: number, updates: Partial<Sucursal>): Promise<Sucursal> {
        const { data, error } = await supabase.from('sucursales').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },
    async deleteSucursal(id: number): Promise<void> {
        const { error } = await supabase.from('sucursales').delete().eq('id', id);
        if (error) throw error;
    },

    // Posiciones
    async getPosiciones(): Promise<Posicion[]> {
        const { data, error } = await supabase.from('posiciones').select('*');
        if (error) throw error;
        return data || [];
    },

    // Empleados
    async getEmpleados(): Promise<Empleado[]> {
        const { data, error } = await supabase
            .from('empleados')
            .select('*, posicion:fk_posicion_principal(*), sucursal:fk_sucursal_base(*)');
        if (error) throw error;
        return data.map(e => ({...e, posicion: e.posicion, sucursal: e.sucursal})) || [];
    },
    async addEmpleado(empleado: Partial<Empleado> & { email: string; password?: string; }): Promise<void> {
        // Step 1: Create the auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: empleado.email,
            password: empleado.password,
            email_confirm: true, // Auto-confirm user
            user_metadata: { nombre_completo: empleado.nombre_completo }
        });

        if (authError) {
            throw new Error(`Error creating auth user: ${authError.message}`);
        }
        
        const newUserId = authData.user.id;
        
        // Step 2: Update the profile created by the trigger
        const { error: profileError } = await supabase
            .from('empleados')
            .update({
                nombre_completo: empleado.nombre_completo,
                fk_posicion_principal: empleado.fk_posicion_principal,
                fk_sucursal_base: empleado.fk_sucursal_base,
                horas_contrato_semanales: empleado.horas_contrato_semanales
            })
            .eq('id', newUserId);

        if (profileError) {
            // If profile update fails, try to clean up the created auth user
            await supabase.auth.admin.deleteUser(newUserId);
            throw new Error(`Error updating employee profile: ${profileError.message}`);
        }
    },
    async updateEmpleado(id: string, updates: Partial<Empleado>): Promise<Empleado> {
        const { data, error } = await supabase.from('empleados').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },
    async deleteEmpleado(id: string): Promise<void> {
        // Deleting the auth user will cascade and delete the employee profile
        // due to the trigger `ON DELETE CASCADE` in the DB schema.
        const { error } = await supabase.auth.admin.deleteUser(id);
        if (error) throw error;
    },

    // Turnos
    async getTurnos(startDate: Date, endDate: Date): Promise<Turno[]> {
         const { data, error } = await supabase
            .from('turnos')
            .select('*, empleado:fk_empleado(*), posicion:fk_posicion_requerida(*), sucursal:fk_sucursal_asignada(*)')
            .gte('fecha', startDate.toISOString().split('T')[0])
            .lte('fecha', endDate.toISOString().split('T')[0]);
        if (error) throw error;
        return data || [];
    },
    async addTurno(turno: Omit<Turno, 'id'>): Promise<Turno> {
        const { data, error } = await supabase.from('turnos').insert(turno).select().single();
        if (error) throw error;
        return data;
    },
    async updateTurno(turnoId: number, updates: Partial<Turno>): Promise<Turno> {
        const { data, error } = await supabase.from('turnos').update(updates).eq('id', turnoId).select().single();
        if (error) throw error;
        return data;
    },
    async getTurnosByEmpleado(empleadoId: string): Promise<Turno[]> {
        const { data, error } = await supabase
            .from('turnos')
            .select('*, sucursal:fk_sucursal_asignada(*), posicion:fk_posicion_requerida(*)')
            .eq('fk_empleado', empleadoId);
        if (error) throw error;
        return data.map(t => ({...t, sucursal: t.sucursal, posicion: t.posicion })) || [];
    },
    
    // FIX: Add calcularHorasSemanales function to calculate total scheduled hours for an employee.
    async calcularHorasSemanales(empleadoId: string, startDate: Date, endDate: Date): Promise<HorasSemanales> {
        const { data: turnos, error } = await supabase
            .from('turnos')
            .select('hora_inicio, hora_fin')
            .eq('fk_empleado', empleadoId)
            .gte('fecha', startDate.toISOString().split('T')[0])
            .lte('fecha', endDate.toISOString().split('T')[0]);
        
        if (error) {
            console.error(`Error fetching shifts for employee ${empleadoId}:`, error);
            throw error;
        }

        const duracionTurno = (turno: Pick<Turno, 'hora_inicio' | 'hora_fin'>): number => {
            if (!turno.hora_inicio || !turno.hora_fin) return 0;
            const [startH, startM] = turno.hora_inicio.split(':').map(Number);
            const [endH, endM] = turno.hora_fin.split(':').map(Number);
            let duration = (endH + endM / 60) - (startH + startM / 60);
            if (duration < 0) duration += 24; // Handles overnight shifts
            return duration;
        };

        const total_horas = turnos.reduce((acc, turno) => acc + duracionTurno(turno), 0);

        return {
            fk_empleado: empleadoId,
            total_horas: total_horas,
        };
    },

    // Cambios
    async getCambiosPendientes(): Promise<CambioPendiente[]> {
         const { data, error } = await supabase
            .from('cambios_pendientes')
            .select('*, turno:fk_turno_original(*), turno_solicitado:fk_turno_solicitado(*), solicitante:fk_empleado_solicitante(*), destino:fk_empleado_destino(*)');
        if (error) throw error;
        return data || [];
    },
    async updateCambioPendiente(cambioId: number, estado: EstadoCambio): Promise<CambioPendiente> {
        const cambio = (await supabase.from('cambios_pendientes').select('*').eq('id', cambioId).single()).data;

        if (cambio && estado === 'Aprobado') {
             const turnoOriginal = (await supabase.from('turnos').select('*').eq('id', cambio.fk_turno_original).single()).data;
             const turnoSolicitado = cambio.fk_turno_solicitado ? (await supabase.from('turnos').select('*').eq('id', cambio.fk_turno_solicitado).single()).data : null;

            if (turnoOriginal && turnoSolicitado) { // Direct swap
                await supabase.from('turnos').update({ fk_empleado: turnoSolicitado.fk_empleado }).eq('id', turnoOriginal.id);
                await supabase.from('turnos').update({ fk_empleado: turnoOriginal.fk_empleado }).eq('id', turnoSolicitado.id);
            } else if (turnoOriginal) { // Simple offer
                await supabase.from('turnos').update({ fk_empleado: cambio.fk_empleado_destino }).eq('id', turnoOriginal.id);
            }
        }
        
        const { data, error } = await supabase.from('cambios_pendientes').update({ estado }).eq('id', cambioId).select().single();
        if (error) throw error;
        return data;
    },
    async createCambioPendiente(cambioData: Pick<CambioPendiente, 'fk_turno_original' | 'fk_empleado_solicitante' | 'fk_empleado_destino' | 'fk_turno_solicitado'>): Promise<CambioPendiente> {
        const { data, error } = await supabase.from('cambios_pendientes').insert({ ...cambioData, estado: 'Pendiente' }).select().single();
        if (error) throw error;
        return data;
    },

    // Ausencias
    async getAusencias(): Promise<Ausencia[]> {
        const { data, error } = await supabase.from('ausencias').select('*, empleado:fk_empleado(*)');
        if (error) throw error;
        return data || [];
    },
     async getAusenciasByEmpleado(empleadoId: string): Promise<Ausencia[]> {
        const { data, error } = await supabase.from('ausencias').select('*').eq('fk_empleado', empleadoId);
        if (error) throw error;
        return data || [];
    },
    async createAusencia(ausencia: Omit<Ausencia, 'id' | 'empleado' | 'estado'>): Promise<Ausencia> {
        const { data, error } = await supabase.from('ausencias').insert({...ausencia, estado: 'Pendiente' }).select().single();
        if (error) throw error;
        return data;
    },
    async updateAusencia(id: number, estado: EstadoAusencia): Promise<Ausencia> {
        const { data, error } = await supabase.from('ausencias').update({ estado }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    // Plantillas de Turno
    async getTurnoPlantillas(): Promise<TurnoPlantilla[]> {
        const { data, error } = await supabase.from('turno_plantillas').select('*');
        if (error) throw error;
        return data || [];
    },
    async addTurnoPlantilla(plantilla: Omit<TurnoPlantilla, 'id'>): Promise<TurnoPlantilla> {
        const { data, error } = await supabase.from('turno_plantillas').insert(plantilla).select().single();
        if (error) throw error;
        return data;
    },
    async updateTurnoPlantilla(id: number, updates: Partial<TurnoPlantilla>): Promise<TurnoPlantilla> {
        const { data, error } = await supabase.from('turno_plantillas').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },
    async deleteTurnoPlantilla(id: number): Promise<void> {
        const { error } = await supabase.from('turno_plantillas').delete().eq('id', id);
        if (error) throw error;
    }
};

export const subscribeToChanges = (table: string, filter: string, callback: (payload: any) => void) => {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} };
    const channel = supabase.channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table, filter }, payload => {
            callback(payload);
        })
        .subscribe();

    return {
        unsubscribe: () => {
            supabase.removeChannel(channel);
        }
    };
};
