import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors, ArrowRight } from "lucide-react";

const ClientPortalLoginPage = () => {
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (phone) {
      navigate("/portal/view", { state: { phone } });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 text-white p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="flex items-center justify-center gap-2 text-2xl font-bold">
            <Scissors className="h-8 w-8 text-primary" />
            <span>Portal do Cliente</span>
          </Link>
          <p className="text-gray-300 mt-2">Acesse seus agendamentos de forma rápida e fácil.</p>
        </div>
        <Card className="backdrop-blur-md bg-white/5 border border-white/10 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Consultar Agendamentos</CardTitle>
            <CardDescription className="text-gray-300">
              Digite o número de telefone que você usou para agendar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="tel"
                placeholder="Seu telefone com DDD"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:ring-primary focus:border-primary h-12 text-lg"
              />
              <Button type="submit" className="w-full h-12 text-lg">
                Consultar
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>
          </CardContent>
        </Card>
         <p className="mt-6 text-center text-sm text-gray-400">
          É um profissional?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Acesse o painel
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ClientPortalLoginPage;