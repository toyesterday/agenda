import { Calendar, Smartphone, MessageCircle, Users, BarChart2, Store } from "lucide-react";

const featuresList = [
  {
    icon: <Calendar className="h-8 w-8 text-blue-400" />,
    title: "Agendamento Online 24/7",
    description: "Seus clientes podem agendar a qualquer hora, de qualquer lugar, diretamente pelo seu site.",
  },
  {
    icon: <MessageCircle className="h-8 w-8 text-blue-400" />,
    title: "Integração WhatsApp",
    description: "Envie confirmações e lembretes automáticos, reduzindo o não comparecimento.",
  },
  {
    icon: <Users className="h-8 w-8 text-blue-400" />,
    title: "Gestão de Profissionais",
    description: "Controle horários, serviços e comissões de cada membro da sua equipe facilmente.",
  },
  {
    icon: <BarChart2 className="h-8 w-8 text-blue-400" />,
    title: "Dashboard Completo",
    description: "Tenha uma visão clara do seu faturamento, agendamentos e performance em tempo real.",
  },
  {
    icon: <Smartphone className="h-8 w-8 text-blue-400" />,
    title: "Progressive Web App (PWA)",
    description: "Ofereça uma experiência de aplicativo nativo, acessível de qualquer dispositivo.",
  },
  {
    icon: <Store className="h-8 w-8 text-blue-400" />,
    title: "Multi-salões",
    description: "Gerencie múltiplas filiais ou estabelecimentos a partir de uma única conta.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-20 md:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white">Funcionalidades para decolar seu negócio</h2>
          <p className="max-w-2xl mx-auto text-gray-300 mt-4">
            Tudo o que você precisa para otimizar a gestão e focar no que realmente importa: seus clientes.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuresList.map((feature) => (
            <div key={feature.title} className="transition-all duration-300 hover:scale-105 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl text-left">
              {feature.icon}
              <h3 className="mt-4 text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;