import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import AddUserForm from "@/components/AddUserForm";
import EditUserForm from "@/components/EditUserForm";
import { PlusCircle, ShieldCheck, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

type Profile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  role: string;
};

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, business_name, role");

    if (error) {
      showError(error.message);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
    fetchUsers();
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    fetchUsers();
  };

  const handleDelete = async (userIdToDelete: string) => {
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userIdToDelete },
      });

      if (error) {
        const parsedError = JSON.parse(error.context?.responseText || '{}');
        throw new Error(parsedError.error || error.message);
      }
      
      showSuccess("Usuário excluído com sucesso!");
      fetchUsers();
    } catch (e: any) {
      showError(e.message);
    }
  };

  const ActionsMenu = ({ user }: { user: Profile }) => (
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
          <DropdownMenuItem
            onClick={() => {
              setSelectedUser(user);
              setIsEditDialogOpen(true);
            }}
            className="focus:bg-white/10 focus:text-white"
          >
            Editar
          </DropdownMenuItem>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-red-400 focus:bg-red-400/20 focus:text-red-400">Excluir</DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent className="bg-gray-800/80 backdrop-blur-md border border-white/20 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Você tem certeza?</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300">
            Essa ação não pode ser desfeita. Isso excluirá permanentemente o usuário e todos os dados associados ao seu negócio (agendamentos, clientes, etc).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-white/20 hover:bg-white/10">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleDelete(user.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Sim, excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Gerenciamento de Usuários</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-gray-800/80 backdrop-blur-md border border-white/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Novo Usuário (Salão)</DialogTitle>
            </DialogHeader>
            <AddUserForm onSuccess={handleAddSuccess} />
          </DialogContent>
        </Dialog>
      </div>
      <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Seus Clientes</CardTitle>
          <CardDescription className="text-gray-300">
            Lista de todos os salões que utilizam seu sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-b-white/10 hover:bg-transparent">
                <TableHead className="text-white">Negócio</TableHead>
                <TableHead className="text-white">Responsável</TableHead>
                <TableHead className="text-white">Permissão</TableHead>
                <TableHead className="text-right text-white">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-300 py-10">Carregando...</TableCell>
                </TableRow>
              ) : users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id} className="border-b-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">{user.business_name || "N/A"}</TableCell>
                    <TableCell className="text-gray-300">{user.full_name || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'} className={user.role === 'super_admin' ? '' : 'bg-blue-900/50 text-blue-200 border-blue-500/50'}>
                        {user.role === 'super_admin' && <ShieldCheck className="mr-1 h-3 w-3" />}
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {currentUser?.id !== user.id && user.role !== 'super_admin' ? (
                        <ActionsMenu user={user} />
                      ) : (
                        <div className="h-8 w-8 p-0" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-300 py-10">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800/80 backdrop-blur-md border border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Usuário</DialogTitle>
          </DialogHeader>
          {selectedUser && <EditUserForm profile={selectedUser} onSuccess={handleEditSuccess} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;