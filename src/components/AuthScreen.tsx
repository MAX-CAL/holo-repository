import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, KeyRound } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  accessCode: z.string().min(3, { message: "Access code must be at least 3 characters" }).max(20, { message: "Access code must be less than 20 characters" }),
});

interface AuthScreenProps {
  onSuccess: () => void;
}

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Validate all fields for signup
        const validation = authSchema.safeParse({ email, password, accessCode });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              access_code: accessCode.trim().toLowerCase(),
            },
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in instead.');
          } else {
            toast.error(error.message);
          }
          setIsLoading(false);
          return;
        }

        setIsAnimating(true);
        toast.success('Your universe has been created!');
        setTimeout(() => {
          onSuccess();
        }, 800);
      } else {
        // Login - only validate email and password
        const loginValidation = z.object({
          email: z.string().trim().email({ message: "Invalid email address" }),
          password: z.string().min(1, { message: "Password is required" }),
        }).safeParse({ email, password });

        if (!loginValidation.success) {
          toast.error(loginValidation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
          setIsLoading(false);
          return;
        }

        setIsAnimating(true);
        toast.success('Welcome back!');
        setTimeout(() => {
          onSuccess();
        }, 800);
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
      setIsLoading(false);
    }
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
      className={`fixed inset-0 flex items-center justify-center bg-background transition-all duration-1000 z-50 ${isAnimating ? 'opacity-0 scale-150' : 'opacity-100 scale-100'}`}
      style={{ touchAction: 'manipulation' }}
    >
      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm px-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-foreground flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-background" />
          </div>
          <div className="text-center">
            <h1 className="font-medium text-foreground text-2xl">I</h1>
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Create your universe' : 'Welcome back'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4 pointer-events-auto">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              type="email" 
              inputMode="email"
              placeholder="Email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              onTouchStart={(e) => e.currentTarget.focus()}
              className="h-14 pl-12 bg-card/50 border-border text-base placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20 transition-all pointer-events-auto" 
              style={inputStyle}
              autoComplete="email" 
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              onTouchStart={(e) => e.currentTarget.focus()}
              className="h-14 pl-12 bg-card/50 border-border text-base placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20 transition-all pointer-events-auto" 
              style={inputStyle}
              autoComplete={isSignUp ? "new-password" : "current-password"} 
            />
          </div>

          {isSignUp && (
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                type="text" 
                inputMode="text"
                placeholder="Access Code (PIN)" 
                value={accessCode} 
                onChange={e => setAccessCode(e.target.value)} 
                onTouchStart={(e) => e.currentTarget.focus()}
                className="h-14 pl-12 bg-card/50 border-border text-base placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20 transition-all pointer-events-auto" 
                style={inputStyle}
                autoComplete="off" 
              />
              <p className="text-xs text-muted-foreground mt-1 ml-1">
                This code locks your app. You'll enter it each time you open the app.
              </p>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full h-12 bg-foreground hover:bg-foreground/90 text-background font-medium transition-all pointer-events-auto"
            style={{ touchAction: 'manipulation' }}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              isSignUp ? 'Create Universe' : 'Sign In'
            )}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors pointer-events-auto"
          style={{ touchAction: 'manipulation' }}
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
