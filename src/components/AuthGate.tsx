import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Sparkles, Plus } from 'lucide-react';
interface AuthGateProps {
  onSuccess: () => void;
}
export function AuthGate({
  onSuccess
}: AuthGateProps) {
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const {
    loginWithCode,
    createUniverse
  } = useAuth();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      toast.error('Please enter an access code');
      return;
    }
    setIsLoading(true);
    const result = await loginWithCode(accessCode);
    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }
    if (result.isNew) {
      setShowCreatePrompt(true);
      setIsLoading(false);
      return;
    }

    // Successfully logged in
    setIsAnimating(true);
    toast.success('Welcome back to your universe!');
    setTimeout(() => {
      onSuccess();
    }, 800);
  };
  const handleCreateUniverse = async () => {
    setIsLoading(true);
    const result = await createUniverse(accessCode);
    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }
    setIsAnimating(true);
    toast.success('Your universe has been created!');
    setTimeout(() => {
      onSuccess();
    }, 800);
  };
  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center bg-white transition-all duration-1000 z-50 ${isAnimating ? 'opacity-0 scale-150' : 'opacity-100 scale-100'}`}
      style={{ touchAction: 'manipulation' }}
    >
      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm px-6">
        {/* Black circle with white dot logo */}
        <div className="flex flex-col items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white" />
          </div>
          <div className="text-center">
            <h1 className="font-medium text-foreground text-2xl">
              I
            </h1>
            <p className="text-sm text-muted-foreground">
              Your personal second brain
            </p>
          </div>
        </div>

        {!showCreatePrompt ? (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <Input 
              type="text" 
              placeholder="Enter your Access Code" 
              value={accessCode} 
              onChange={e => setAccessCode(e.target.value)} 
              className="h-14 bg-card/50 border-border text-center text-base placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20 transition-all pointer-events-auto" 
              style={{ fontSize: '16px', touchAction: 'manipulation' }}
              autoFocus 
              autoComplete="off" 
            />

            <Button 
              type="submit" 
              disabled={isLoading} 
              className="w-full h-12 bg-black hover:bg-black/90 text-white font-medium transition-all pointer-events-auto"
              style={{ touchAction: 'manipulation' }}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Universe'}
            </Button>
          </form>
        ) : (
          <div className="w-full space-y-4 text-center">
            <div className="p-4 bg-card/50 border border-border rounded-xl">
              <p className="text-foreground mb-2">
                No universe exists with code:
              </p>
              <p className="text-lg font-mono text-primary">
                "{accessCode}"
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Would you like to create a new universe with this code?
            </p>

            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setShowCreatePrompt(false)} 
                className="flex-1" 
                disabled={isLoading}
              >
                Go Back
              </Button>
              <Button 
                onClick={handleCreateUniverse} 
                disabled={isLoading} 
                className="flex-1 gap-2 bg-black hover:bg-black/90 text-white"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}