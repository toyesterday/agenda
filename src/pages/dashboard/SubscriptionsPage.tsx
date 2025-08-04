import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Edit } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import EditSubscriptionForm from "@/components/EditSubscriptionForm";

type Profile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  role: string;
  subscription_due_date: string | null;
  subscription_status: string | null;
};

const SubscriptionsPage = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, business_name, role, subscription_due_date, subscription_status")
      .eq("role", "admin"); // Fetch only client salons

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

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    fetchUsers();
  };

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'active': return 'secondary';
      case 'due': return 'destructive';
      case 'inactive': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Gerenciamento de Assinaturas</h1>
      <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Clientes Ativos</CardTitle>
          <CardDescription className="text-gray-300">
            Gerencie o status e o vencimento da mensalidade de cada salão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-b-white/10 hover:bg-transparent">
                <TableHead className="text-white">Negócio</TableHead>
                <TableHead className="text-white">Responsável</TableHead>
                <TableHead className="text-white">Vencimento</TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-right text-white">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-300 py-10">Carregando...</TableCell>
                </TableRow>
              ) : users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id} className="border-b-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">{user.business_name || "N/A"}</TableCell>
                    <TableCell className="text-gray-300">{user.full_name || "N/A"}</TableCell>
                    <TableCell className="text-gray-300">
                      {user.subscription_due_date ? format(new Date(user.subscription_due_date), "dd/MM/yyyy") : "Não definido"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(user.subscription_status)} className={user.subscription_status === 'active' ? 'bg-green-900/50 text-green-200 border-green-500/50' : ''}>
                        {user.subscription_status || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedProfile(user); setIsEditDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-300 py-10">
                    Nenhum salão cliente encontrado.
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
            <DialogTitle className="text-white">Editar Assinatura</DialogTitle>
          </DialogHeader>
          {selectedProfile && <EditSubscriptionForm profile={selectedProfile} onSuccess={handleEditSuccess} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionsPage;