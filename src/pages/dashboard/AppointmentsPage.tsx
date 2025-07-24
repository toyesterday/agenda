import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import AppointmentForm, { Appointment } from "@/components/AppointmentForm";
import BlockSlotForm, { BlockedSlot } from "@/components/BlockSlotForm";
import { PlusCircle, Star, Loader2, Calendar, User, Tag, DollarSign, Trash2, Lock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AppointmentCalendar from "@/components/AppointmentCalendar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";

type AppointmentWithDetails = Appointment & {
  clients: { full_name: string } | null;
  professionals: { full_name: string } | null;
};

type Professional = {
  id: number;
  full_name: string;
  auth_id: string | null;
};

const AppointmentsPage = () => {
  const { user, profile } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [viewableProfessionals, setViewableProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isBlockFormOpen, setIsBlockFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteBlockOpen, setIsDeleteBlockOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedBlockedSlot, setSelectedBlockedSlot] = useState<BlockedSlot | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const appointmentsPromise = supabase.from("appointments").select("*, clients(full_name), professionals(full_name)").order("start_time", { ascending: false });
        const professionalsPromise = supabase.from("professionals").select("id, full_name, auth_id");
        const blockedSlotsPromise = supabase.from("blocked_slots").select("*");

        const [appointmentsRes, professionalsRes, blockedSlotsRes] = await Promise.all([
          appointmentsPromise,
          professionalsPromise,
          blockedSlotsPromise,
        ]);

        if (appointmentsRes.error) throw appointmentsRes.error;
        if (professionalsRes.error) throw professionalsRes.error;
        if (blockedSlotsRes.error) throw blockedSlotsRes.error;

        const allProfessionals = (professionalsRes.data as Professional[]) || [];
        setProfessionals(allProfessionals);
        setAppointments((appointmentsRes.data as AppointmentWithDetails[]) || []);
        setBlockedSlots(blockedSlotsRes.data || []);

        if (profile?.role === 'professional' && user) {
          const self = allProfessionals.find(p => p.auth_id === user.id);
          setViewableProfessionals(self ? [self] : []);
        } else {
          setViewableProfessionals(allProfessionals);
        }

      } catch (error: any) {
        showError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, profile]);

  const handleSuccess = () => {
    setIsFormDialogOpen(false);
    setSelectedAppointment(null);
    if (user) {
      // Re-fetch data after success
      const fetchData = async () => {
        const { data, error } = await supabase.from("appointments").select("*, clients(full_name), professionals(full_name)").order("start_time", { ascending: false });
        if (error) showError(error.message);
        else setAppointments((data as AppointmentWithDetails[]) || []);
      };
      fetchData();
    }
  };

  const handleBlockSuccess = () => {
    setIsBlockFormOpen(false);
    setSelectedBlockedSlot(null);
    if (user) {
      // Re-fetch data after success
      const fetchData = async () => {
        const { data, error } = await supabase.from("blocked_slots").select("*");
        if (error) showError(error.message);
        else setBlockedSlots(data || []);
      };
      fetchData();
    }
  };

  const handleEventClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsFormDialogOpen(true);
  };

  const handleBlockedSlotClick = (slot: BlockedSlot) => {
    setSelectedBlockedSlot(slot);
    setIsBlockFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedAppointment) return;
    const { error } = await supabase.from("appointments").delete().eq("id", selectedAppointment.id);
    if (error) showError(error.message);
    else {
      showSuccess("Agendamento excluído com sucesso!");
      setIsFormDialogOpen(false);
      setSelectedAppointment(null);
      handleSuccess(); // Re-fetch
    }
    setIsDeleteDialogOpen(false);
  };

  const handleDeleteBlock = async () => {
    if (!selectedBlockedSlot) return;
    const { error } = await supabase.from("blocked_slots").delete().eq("id", selectedBlockedSlot.id);
    if (error) showError(error.message);
    else {
      showSuccess("Horário desbloqueado com sucesso!");
      setIsBlockFormOpen(false);
      setSelectedBlockedSlot(null);
      handleBlockSuccess(); // Re-fetch
    }
    setIsDeleteBlockOpen(false);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-white">Agenda</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" className="w-full bg-transparent border-white/20 hover:bg-white/10" onClick={() => { setSelectedBlockedSlot(null); setIsBlockFormOpen(true); }}>
              <Lock className="mr-2 h-4 w-4" />
              Bloquear Horário
            </Button>
            <Button className="w-full" onClick={() => { setSelectedAppointment(null); setIsFormDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>
          </div>
        </div>
        <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Calendário de Agendamentos</CardTitle>
            <CardDescription className="text-gray-300">
              Visualize e gerencie todos os seus agendamentos e bloqueios de forma interativa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isMobile ? (
              <div className="space-y-4">
                {appointments.length > 0 ? (
                  appointments.map((appt) => (
                    <Card key={appt.id} className="bg-white/5 border border-white/10" onClick={() => handleEventClick(appt)}>
                      <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div>
                          <CardTitle className="text-base text-white">{appt.clients?.full_name || 'N/A'}</CardTitle>
                          <Badge variant={getStatusVariant(appt.status)} className="mt-1">{appt.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-gray-300">
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>{format(new Date(appt.start_time), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span></div>
                        <div className="flex items-center gap-2"><User className="h-4 w-4" /><span>{appt.professionals?.full_name || 'N/A'}</span></div>
                        <div className="flex items-center gap-2"><Tag className="h-4 w-4" /><span>{appt.service_name}</span></div>
                        <div className="flex items-center gap-2"><DollarSign className="h-4 w-4" /><span>R$ {appt.price.toFixed(2)}</span></div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-gray-300 py-10">Nenhum agendamento encontrado.</p>
                )}
              </div>
            ) : (
              <AppointmentCalendar appointments={appointments} blockedSlots={blockedSlots} professionals={viewableProfessionals} onEventClick={handleEventClick} onBlockedSlotClick={handleBlockedSlotClick} />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormDialogOpen} onOpenChange={(open) => { setIsFormDialogOpen(open); if (!open) setSelectedAppointment(null); }}>
        <DialogContent className="sm:max-w-lg bg-gray-800/80 backdrop-blur-md border border-white/20 text-white">
          <DialogHeader><DialogTitle className="text-white">{selectedAppointment ? 'Editar' : 'Novo'} Agendamento</DialogTitle></DialogHeader>
          <AppointmentForm appointment={selectedAppointment} onSuccess={handleSuccess} user={user} profile={profile} professionals={professionals} />
          {selectedAppointment && (
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild><Button variant="destructive" className="w-full mt-2"><Trash2 className="mr-2 h-4 w-4" />Excluir Agendamento</Button></AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-800/80 backdrop-blur-md border border-white/20 text-white">
                <AlertDialogHeader><AlertDialogTitle className="text-white">Você tem certeza?</AlertDialogTitle><AlertDialogDescription className="text-gray-300">Essa ação não pode ser desfeita. Isso excluirá permanentemente o agendamento.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel className="bg-transparent border-white/20 hover:bg-white/10">Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sim, excluir</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isBlockFormOpen} onOpenChange={(open) => { setIsBlockFormOpen(open); if (!open) setSelectedBlockedSlot(null); }}>
        <DialogContent className="sm:max-w-lg bg-gray-800/80 backdrop-blur-md border border-white/20 text-white">
          <DialogHeader><DialogTitle className="text-white">{selectedBlockedSlot ? 'Editar' : 'Bloquear'} Horário</DialogTitle></DialogHeader>
          <BlockSlotForm blockedSlot={selectedBlockedSlot} onSuccess={handleBlockSuccess} user={user} profile={profile} professionals={professionals} />
          {selectedBlockedSlot && (
            <AlertDialog open={isDeleteBlockOpen} onOpenChange={setIsDeleteBlockOpen}>
              <AlertDialogTrigger asChild><Button variant="destructive" className="w-full mt-2"><Trash2 className="mr-2 h-4 w-4" />Remover Bloqueio</Button></AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-800/80 backdrop-blur-md border border-white/20 text-white">
                <AlertDialogHeader><AlertDialogTitle className="text-white">Você tem certeza?</AlertDialogTitle><AlertDialogDescription className="text-gray-300">Essa ação não pode ser desfeita. Isso liberará o horário na agenda.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel className="bg-transparent border-white/20 hover:bg-white/10">Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sim, remover</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppointmentsPage;