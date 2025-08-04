import { usePWA } from '@/context/PWAContext';
import { Button } from './ui/button';
import { Download, Share } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const AddToHomeScreen = () => {
  const { isInstallable, triggerInstall } = usePWA();
  const [showIosInstallMessage, setShowIosInstallMessage] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Detecta se é um dispositivo Apple (iPhone, iPad, iPod)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Verifica se não é o Chrome no iOS, o que geralmente significa que é o Safari
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isMobile && isIOS && isSafari && !isInstallable) {
      setShowIosInstallMessage(true);
    }
  }, [isInstallable, isMobile]);

  // Se o navegador oferece a instalação nativa, mostre o botão de download.
  if (isInstallable) {
    return (
      <Button
        onClick={triggerInstall}
        className="fixed bottom-4 right-4 z-50 rounded-full h-14 w-14 shadow-lg"
        size="icon"
        aria-label="Instalar App"
      >
        <Download className="h-6 w-6" />
      </Button>
    );
  }

  // Se for um dispositivo iOS (provavelmente Safari), mostre a instrução manual.
  if (showIosInstallMessage) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50">
        <div className="bg-primary/90 text-primary-foreground p-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-up">
          <Share className="h-6 w-6 flex-shrink-0" />
          <p className="text-sm">
            Para instalar o app, toque no ícone de Compartilhar e depois em "Adicionar à Tela de Início".
          </p>
        </div>
      </div>
    );
  }

  // Se nenhuma das condições acima for atendida, não mostre nada.
  return null;
};

export default AddToHomeScreen;