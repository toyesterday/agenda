import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import AddClientForm from "@/components/AddClientForm";
import EditClientForm from "@/components/EditClientForm";
import { PlusCircle, MoreHorizontal, Mail, Phone, Star, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Client = {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  loyalty_points: Record<string, number> | null;
};

const renderLoyaltyPoints = (points: Record<string, number> | null) => {
  if (!points || Object.keys(points).length === 0) {
    return <span className="text-gray-400 text-xs">Nenhum ponto</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(points).map(([service, count]) => (
        <Badge key={service} variant="secondary" className="bg-blue-900/50 text-blue-200 border-blue-500/50">
          {service.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {count}/10
        </Badge>
      ))}
    </div>
  );
};

const ClientsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchClients = async (searchQuery = "") => {
    setLoading(true);
    let query = supabase
      .from("clients")
      .select("id, full_name, email, phone, notes, created_at, loyalty_points")
      .order("created_at", { ascending: false });

    if (searchQuery) {
      const searchString = `%${searchQuery}%`;
      query = query.or(`full_name.ilike.${searchString},email.ilike.${searchString},phone.ilike.${searchString}`);
    }

    const { data, error } = await query;

    if (error) {
      showError(error.message);
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchClients(searchTerm);
    }, 300); // Debounce de 300ms

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
    fetchClients(searchTerm);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    fetchClients(searchTerm);
  };

  const handleDelete = async (clientId: number) => {
    const { error } = await supabase.from("clients").delete().eq("id", clientId);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Cliente excluído com sucesso!");
      fetchClients(searchTerm);
    }
  };

  const ActionsMenu = ({ client }: { client: Client }) => (
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
              setSelectedClient(client);
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
            Essa ação não pode ser desfeita. Isso excluirá permanentemente o cliente e todos os seus agendamentos associados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-white/20 hover:bg-white/10">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleDelete(client.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Sim, excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Clientes</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Buscar cliente..."
              className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] bg-white/5 border-white/20 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-gray-800/80 backdrop-blur-md border border-white/20 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Novo Cliente</DialogTitle>
              </DialogHeader>
              <AddClientForm onSuccess={handleAddSuccess} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Sua Lista de Clientes</CardTitle>
          <CardDescription className="text-gray-300">
            Gerencie todos os seus clientes e seus pontos de fidelidade em um só lugar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-b-white/10 hover:bg-transparent">
                  <TableHead className="text-white">Nome</TableHead>
                  <TableHead className="text-white">Contato</TableHead>
                  <TableHead className="text-white">Pontos de Fidelidade</TableHead>
                  <TableHead className="text-white">Cliente Desde</TableHead>
                  <TableHead className="text-right text-white">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-300 py-10">Carregando...</TableCell>
                  </TableRow>
                ) : clients.length > 0 ? (
                  clients.map((client) => (
                    <TableRow key={client.id} className="border-b-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">{client.full_name}</TableCell>
                      <TableCell className="text-gray-300 text-xs">
                        <div>{client.email || "-"}</div>
                        <div>{client.phone || "-"}</div>
                      </TableCell>
                      <TableCell>
                        {renderLoyaltyPoints(client.loyalty_points)}
                      </TableCell>
                      <TableCell className="text-gray-300">{new Date(client.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <ActionsMenu client={client} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-300 py-10">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {loading ? (
              <p className="text-center text-gray-300 py-10">Carregando...</p>
            ) : clients.length > 0 ? (
              clients.map((client) => (
                <Card key={client.id} className="bg-white/5 border border-white/10">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base text-white">{client.full_name}</CardTitle>
                    <ActionsMenu client={client} />
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {client.email && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Mail className="h-4 w-4" />
                        <span>{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Phone className="h-4 w-4" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    <div className="border-t border-white/10 pt-3 mt-3">
                      <div className="flex items-center gap-2 text-gray-300 mb-2">
                        <Star className="h-4 w-4" />
                        <span className="font-semibold">Fidelidade</span>
                      </div>
                      {renderLoyaltyPoints(client.loyalty_points)}
                    </div>
                    <p className="text-xs text-gray-400 pt-2">
                      Cliente desde {new Date(client.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center text-gray-300 py-10">
                Nenhum cliente encontrado.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800/80 backdrop-blur-md border border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Cliente</DialogTitle>
          </DialogHeader>
          {selectedClient && <EditClientForm client={selectedClient} onSuccess={handleEditSuccess} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPage;