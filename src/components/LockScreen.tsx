import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, LogOut } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface LockScreenProps {
  user: User;
  onUnlock: () => void;
  onLogout: () => void;
}

export function LockScreen({ user, onUnlock, onLogout }: LockScreenProps) {
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessCode.trim()) {
      toast.error('Please enter your access code');
      return;
    }

    setIsLoading(true);

    try {
      // Fetch the user's access code from the database
      const { data: userData, error } = await supabase
        .from('users')
        .select('access_code')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching access code:', error);
        toast.error('Failed to verify access code');
        setIsLoading(false);
        return;
      }

      // Compare the entered code with stored code
      if (userData.access_code === accessCode.trim().toLowerCase()) {
        setIsAnimating(true);
        toast.success('Welcome back to your universe!');
        setTimeout(() => {
          onUnlock();
        }, 800);
      } else {
        toast.error('Incorrect access code');
        setIsLoading(false);
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    onLogout();
  };

  const inputStyle = { 
    fontSize: '16px', 
    touchAction: 'manipulation', 
    WebkitTapHighlightColor: 'transparent', 
    WebkitUserSelect: 'text', 
    userSelect: 'text' 
  } as React.CSSProperties;

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center bg-foreground transition-all duration-1000 z-50 ${isAnimating ? 'opacity-0 scale-150' : 'opacity-100 scale-100'}`}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Logout button in corner */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="absolute top-6 right-6 p-2 text-background/60 hover:text-background transition-colors pointer-events-auto"
        style={{ touchAction: 'manipulation' }}
      >
        {isLoggingOut ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <LogOut className="w-5 h-5" />
        )}
      </button>

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm px-6">
        {/* Logo - inverted colors for dark background */}
        <div className="flex flex-col items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-foreground" />
          </div>
          <div className="text-center">
            <h1 className="font-medium text-background text-2xl">Locked</h1>
            <p className="text-sm text-background/60">
              Enter your access code to unlock
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4 pointer-events-auto">
          <Input 
            type="text" 
            inputMode="text"
            placeholder="Enter Access Code" 
            value={accessCode} 
            onChange={e => setAccessCode(e.target.value)} 
            onTouchStart={(e) => e.currentTarget.focus()}
            className="h-14 bg-background/10 border-background/20 text-background text-center text-base placeholder:text-background/40 focus:border-background/50 focus:ring-background/20 transition-all pointer-events-auto" 
            style={inputStyle}
            autoComplete="off" 
          />

          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full h-12 bg-background hover:bg-background/90 text-foreground font-medium transition-all pointer-events-auto"
            style={{ touchAction: 'manipulation' }}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Unlock'
            )}
          </Button>
        </form>

        <p className="text-xs text-background/40 text-center">
          Signed in as {user.email}
        </p>
      </div>
    </div>
  );
}
