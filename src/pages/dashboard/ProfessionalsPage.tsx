import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import AddProfessionalForm from "@/components/AddProfessionalForm";
import EditProfessionalForm from "@/components/EditProfessionalForm";
import ScheduleManagementForm from "@/components/ScheduleManagementForm";
import CreateProfessionalUserForm from "@/components/CreateProfessionalUserForm";
import { PlusCircle, MoreHorizontal, Phone, UserPlus, CheckCircle } from "lucide-react";

type Professional = {
  id: number;
  full_name: string;
  phone: string | null;
  created_at: string;
  auth_id: string | null;
};

const ProfessionalsPage = () => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isCreateLoginOpen, setIsCreateLoginOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);

  const fetchProfessionals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("professionals")
      .select("id, full_name, phone, created_at, auth_id")
      .order("created_at", { ascending: false });

    if (error) {
      showError(error.message);
    } else {
      setProfessionals(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const handleAddSuccess = () => { setIsAddDialogOpen(false); fetchProfessionals(); };
  const handleEditSuccess = () => { setIsEditDialogOpen(false); fetchProfessionals(); };
  const handleScheduleSuccess = () => { setIsScheduleDialogOpen(false); };
  const handleCreateLoginSuccess = () => { setIsCreateLoginOpen(false); fetchProfessionals(); };

  const handleDelete = async (professionalId: number) => {
    const { error } = await supabase.from("professionals").delete().eq("id", professionalId);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Profissional excluído com sucesso!");
      fetchProfessionals();
    }
  };

  const ActionsMenu = ({ professional }: { professional: Professional }) => (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-gray-800/80 backdrop-blur-md border border-white/20 text-white">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/20" />
          {professional.auth_id ? (
            <DropdownMenuItem disabled className="focus:bg-transparent text-gray-500">
              <CheckCircle className="mr-2 h-4 w-4" /> Login já existe
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => { setSelectedProfessional(professional); setIsCreateLoginOpen(true); }} className="focus:bg-white/10 focus:text-white">
              <UserPlus className="mr-2 h-4 w-4" /> Criar Login
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => { setSelectedProfessional(professional); setIsEditDialogOpen(true); }} className="focus:bg-white/10 focus:text-white">
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setSelectedProfessional(professional); setIsScheduleDialogOpen(true); }} className="focus:bg-white/10 focus:text-white">
            Gerenciar Horários
          </DropdownMenuItem>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-red-400 focus:bg-red-400/20 focus:text-red-400">Excluir</DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent className="bg-gray-800/80 backdrop-blur-md border border-white/20 text-white">
        <AlertDialogHeader><AlertDialogTitle className="text-white">Você tem certeza?</AlertDialogTitle><AlertDialogDescription className="text-gray-300">Essa ação não pode ser desfeita. Isso excluirá permanentemente o profissional.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel className="bg-transparent border-white/20 hover:bg-white/10">Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(professional.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sim, excluir</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Profissionais</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}><DialogTrigger asChild><Button className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" />Adicionar Profissional</Button></DialogTrigger><DialogContent className="sm:max-w-[425px] bg-gray-800/80 backdrop-blur-md border border-white/20 text-white"><DialogHeader><DialogTitle className="text-white">Novo Profissional</DialogTitle></DialogHeader><AddProfessionalForm onSuccess={handleAddSuccess} /></DialogContent></Dialog>
      </div>
      <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
        <CardHeader><CardTitle className="text-white">Sua Equipe</CardTitle><CardDescription className="text-gray-300">Gerencie seus profissionais, seus horários e crie logins de acesso.</CardDescription></CardHeader>
        <CardContent>
          <div className="hidden md:block"><Table><TableHeader><TableRow className="border-b-white/10 hover:bg-transparent"><TableHead className="text-white">Nome</TableHead><TableHead className="text-white">Telefone</TableHead><TableHead className="text-white">Acesso ao Sistema</TableHead><TableHead className="text-right text-white">Ações</TableHead></TableRow></TableHeader><TableBody>
            {loading ? <TableRow><TableCell colSpan={4} className="text-center text-gray-300 py-10">Carregando...</TableCell></TableRow>
              : professionals.length > 0 ? professionals.map((prof) => (
                <TableRow key={prof.id} className="border-b-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{prof.full_name}</TableCell>
                  <TableCell className="text-gray-300">{prof.phone || "-"}</TableCell>
                  <TableCell>{prof.auth_id ? <CheckCircle className="h-5 w-5 text-green-400" /> : <span className="text-xs text-gray-400">Sem login</span>}</TableCell>
                  <TableCell className="text-right"><ActionsMenu professional={prof} /></TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={4} className="text-center text-gray-300 py-10">Nenhum profissional encontrado.</TableCell></TableRow>}
          </TableBody></Table></div>
          <div className="md:hidden space-y-4">
            {loading ? <p className="text-center text-gray-300 py-10">Carregando...</p>
              : professionals.length > 0 ? professionals.map((prof) => (
                <Card key={prof.id} className="bg-white/5 border border-white/10">
                  <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base text-white">{prof.full_name}</CardTitle><ActionsMenu professional={prof} /></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {prof.phone && <div className="flex items-center gap-2 text-gray-300"><Phone className="h-4 w-4" /><span>{prof.phone}</span></div>}
                    <div className="flex items-center gap-2 text-gray-300">{prof.auth_id ? <><CheckCircle className="h-4 w-4 text-green-400" /><span>Possui acesso</span></> : <><UserPlus className="h-4 w-4 text-gray-400" /><span>Sem acesso</span></>}</div>
                  </CardContent>
                </Card>
              )) : <p className="text-center text-gray-300 py-10">Nenhum profissional encontrado.</p>}
          </div>
        </CardContent>
      </Card>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}><DialogContent className="sm:max-w-[425px] bg-gray-800/80 backdrop-blur-md border border-white/20 text-white"><DialogHeader><DialogTitle className="text-white">Editar Profissional</DialogTitle></DialogHeader>{selectedProfessional && <EditProfessionalForm professional={selectedProfessional} onSuccess={handleEditSuccess} />}</DialogContent></Dialog>
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}><DialogContent className="sm:max-w-lg bg-gray-800/80 backdrop-blur-md border border-white/20 text-white"><DialogHeader><DialogTitle className="text-white">Gerenciar Horários de {selectedProfessional?.full_name}</DialogTitle></DialogHeader>{selectedProfessional && <ScheduleManagementForm professionalId={selectedProfessional.id} onSuccess={handleScheduleSuccess} />}</DialogContent></Dialog>
      <Dialog open={isCreateLoginOpen} onOpenChange={setIsCreateLoginOpen}><DialogContent className="sm:max-w-[425px] bg-gray-800/80 backdrop-blur-md border border-white/20 text-white"><DialogHeader><DialogTitle className="text-white">Criar Login para Profissional</DialogTitle></DialogHeader>{selectedProfessional && <CreateProfessionalUserForm professionalId={selectedProfessional.id} professionalName={selectedProfessional.full_name} onSuccess={handleCreateLoginSuccess} />}</DialogContent></Dialog>
    </div>
  );
};

export default ProfessionalsPage;