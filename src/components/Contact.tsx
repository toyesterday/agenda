import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess } from "@/utils/toast";

const Contact = () => {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("Olá! Gostaria de saber mais sobre o Agenda Fixa.");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const phoneNumber = "5531973149306"; // Número de WhatsApp do "Fale Conosco"
    const whatsappMessage = `Olá! Meu nome é ${name}.\n\nMensagem: ${message}`;
    const encodedMessage = encodeURIComponent(whatsappMessage);
    
    const url = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    window.open(url, '_blank');
    
    showSuccess("Abrindo o WhatsApp para você enviar a mensagem!");
    
    // Limpa o formulário
    setName("");
    setMessage("Olá! Gostaria de saber mais sobre o Agenda Fixa.");
  };

  return (
    <section id="contact" className="py-20 md:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Fale Conosco</h2>
            <p className="text-gray-300">
              Tem alguma dúvida ou sugestão? Nossa equipe está pronta para ajudar. Preencha o formulário ao lado ou entre em contato pelo nosso canal.
            </p>
            <div className="space-y-2 text-gray-300">
              <p><strong>WhatsApp:</strong> (31) 97314-9306</p>
            </div>
          </div>
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 shadow-xl">
            <h3 className="text-2xl font-semibold text-white">Envie uma mensagem</h3>
            <p className="text-gray-300 mt-1">Responderemos o mais breve possível.</p>
            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-300">Nome</label>
                <Input
                  id="name"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-gray-300">Mensagem</label>
                <Textarea
                  id="message"
                  placeholder="Digite sua mensagem aqui..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:ring-primary focus:border-primary min-h-[120px]"
                />
              </div>
              <Button type="submit" className="w-full">Enviar Mensagem via WhatsApp</Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;