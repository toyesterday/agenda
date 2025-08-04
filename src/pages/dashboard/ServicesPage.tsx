import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import AddServiceForm from "@/components/AddServiceForm";
import EditServiceForm from "@/components/EditServiceForm";
import { PlusCircle, MoreHorizontal, DollarSign, Clock } from "lucide-react";

type Service = {
  id: number;
  name: string;
  price: number;
  duration: number;
  created_at: string;
};

const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("id, name, price, duration, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      showError(error.message);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
    fetchServices();
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    fetchServices();
  };

  const handleDelete = async (serviceId: number) => {
    const { error } = await supabase.from("services").delete().eq("id", serviceId);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Serviço excluído com sucesso!");
      fetchServices();
    }
  };

  const ActionsMenu = ({ service }: { service: Service }) => (
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
              setSelectedService(service);
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
            Essa ação não pode ser desfeita. Isso excluirá permanentemente o serviço.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-white/20 hover:bg-white/10">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleDelete(service.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Sim, excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Serviços</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-gray-800/80 backdrop-blur-md border border-white/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Novo Serviço</DialogTitle>
            </DialogHeader>
            <AddServiceForm onSuccess={handleAddSuccess} />
          </DialogContent>
        </Dialog>
      </div>
      <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Sua Lista de Serviços</CardTitle>
          <CardDescription className="text-gray-300">
            Gerencie todos os serviços que seu estabelecimento oferece.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-b-white/10 hover:bg-transparent">
                  <TableHead className="text-white">Nome</TableHead>
                  <TableHead className="text-white">Preço</TableHead>
                  <TableHead className="text-white">Duração</TableHead>
                  <TableHead className="text-right text-white">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-300 py-10">Carregando...</TableCell>
                  </TableRow>
                ) : services.length > 0 ? (
                  services.map((service) => (
                    <TableRow key={service.id} className="border-b-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">{service.name}</TableCell>
                      <TableCell className="text-gray-300">R$ {service.price.toFixed(2)}</TableCell>
                      <TableCell className="text-gray-300">{service.duration} min</TableCell>
                      <TableCell className="text-right">
                        <ActionsMenu service={service} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-300 py-10">
                      Nenhum serviço encontrado. Adicione o primeiro!
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
            ) : services.length > 0 ? (
              services.map((service) => (
                <Card key={service.id} className="bg-white/5 border border-white/10">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base text-white">{service.name}</CardTitle>
                    <ActionsMenu service={service} />
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <DollarSign className="h-4 w-4" />
                      <span>R$ {service.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Clock className="h-4 w-4" />
                      <span>{service.duration} min</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center text-gray-300 py-10">
                Nenhum serviço encontrado. Adicione o primeiro!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800/80 backdrop-blur-md border border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Serviço</DialogTitle>
          </DialogHeader>
          {selectedService && <EditServiceForm service={selectedService} onSuccess={handleEditSuccess} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesPage;