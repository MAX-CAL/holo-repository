import { AuthScreen } from '@/components/AuthScreen';
import { LockScreen } from '@/components/LockScreen';
import { UniverseView } from '@/components/UniverseView';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading, isUnlocked, unlock, signOut } = useAuth();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in -> Show signup/login screen
  if (!user) {
    return <AuthScreen onSuccess={() => {}} />;
  }

  // Logged in but not unlocked -> Show lock screen
  if (!isUnlocked) {
    return (
      <LockScreen 
        user={user} 
        onUnlock={unlock} 
        onLogout={signOut} 
      />
    );
  }

  // Logged in and unlocked -> Show the app
  return <UniverseView onLogout={signOut} />;
};

export default Index;
