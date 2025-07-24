import { usePWA } from '@/context/PWAContext';
import { Button } from './ui/button';
import { Download } from 'lucide-react';

const AddToHomeScreen = () => {
  const { isInstallable, triggerInstall } = usePWA();

  if (!isInstallable) {
    return null;
  }

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
};

export default AddToHomeScreen;