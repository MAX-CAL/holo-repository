import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, KeyRound, UserPlus } from 'lucide-react';

interface AuthGateProps {
  onSuccess: () => void;
}

export function AuthGate({ onSuccess }: AuthGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    const { error } = isSignUp 
      ? await signUp(email, password)
      : await signIn(email, password);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    setIsAnimating(true);
    toast.success(isSignUp ? 'Account created!' : 'Welcome back!');
    
    setTimeout(() => {
      onSuccess();
    }, 800);
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center bg-background transition-all duration-1000 ${isAnimating ? 'opacity-0 scale-150' : 'opacity-100 scale-100'}`}>
      {/* Ambient glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm px-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-medium text-foreground/80">
            {isSignUp ? 'Create Account' : 'Access Universe'}
          </h1>
        </div>

        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 bg-card/50 border-border/50 text-center text-lg placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
          autoFocus
        />

        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 bg-card/50 border-border/50 text-center text-lg placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
        />

        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full h-12 bg-primary/90 hover:bg-primary text-primary-foreground font-medium transition-all"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isSignUp ? (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Create Account
            </>
          ) : (
            'Enter'
          )}
        </Button>

        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </form>
    </div>
  );
}
