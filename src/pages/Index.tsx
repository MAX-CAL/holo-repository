import { useState, useEffect } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { UniverseView } from '@/components/UniverseView';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthGate onSuccess={() => setIsAuthenticated(true)} />;
  }

  return <UniverseView onLogout={() => setIsAuthenticated(false)} />;
};

export default Index;
