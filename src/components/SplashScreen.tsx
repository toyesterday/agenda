import { Loader2 } from "lucide-react";

const SplashScreen = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
  </div>
);

export default SplashScreen;