import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Scissors, AlertTriangle, CheckCircle } from "lucide-react";

const CancelAppointmentPage = () => {
  const { id, token } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: functionError } = await supabase.functions.invoke('cancel-appointment', {
        body: {
          appointmentId: id,
          token: token,
        },
      });

      if (functionError) {
        // Try to parse the function's error response
        const parsedError = JSON.parse(functionError.context?.responseText || '{}');
        throw new Error(parsedError.error || functionError.message);
      }
      
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || "Ocorreu um erro desconhecido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 text-white p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="flex items-center justify-center gap-2 text-2xl font-bold">
            <Scissors className="h-8 w-8 text-primary" />
            <span>Agenda Fixa</span>
          </Link>
        </div>
        <Card className="backdrop-blur-md bg-white/5 border border-white/10 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Cancelar Agendamento</CardTitle>
            <CardDescription className="text-gray-300">
              {success 
                ? "Seu agendamento foi cancelado." 
                : "Você tem certeza que deseja cancelar seu agendamento?"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <p>{error}</p>
              </div>
            )}
            {success ? (
              <div className="flex flex-col items-center gap-4 text-center text-emerald-400">
                <CheckCircle className="h-16 w-16" />
                <p className="text-lg font-medium">Cancelamento confirmado!</p>
                <Button asChild variant="outline" className="bg-transparent border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  <Link to="/">Voltar para a página inicial</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-400">
                  Esta ação não pode ser desfeita. Ao confirmar, seu horário será liberado na agenda do profissional.
                </p>
                <Button 
                  onClick={handleCancel} 
                  disabled={loading}
                  variant="destructive"
                  className="w-full"
                >
                  {loading ? "Cancelando..." : "Sim, quero cancelar"}
                </Button>
                <Button asChild variant="outline" className="w-full bg-transparent border-white/20 hover:bg-white/10">
                  <Link to="/">Não, voltar</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CancelAppointmentPage;