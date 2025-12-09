import { ReactNode, useEffect, useState } from 'react';
import { isReplicatedSubdomain, getAffiliateUsernameFromSubdomain } from '@/utils/subdomainRouting';
import AffiliatePublicPage from '@/pages/AffiliatePublicPage';

interface SubdomainRouterProps {
  children: ReactNode;
}

/**
 * Wrapper component that intercepts subdomain requests and routes to affiliate pages
 * e.g., john.tryeverlaunch.com -> renders AffiliatePublicPage with username="john"
 */
export function SubdomainRouter({ children }: SubdomainRouterProps) {
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (isReplicatedSubdomain()) {
      const affiliateUsername = getAffiliateUsernameFromSubdomain();
      setIsSubdomain(true);
      setUsername(affiliateUsername);
    }
  }, []);

  // If we're on a subdomain, render the affiliate public page directly
  if (isSubdomain && username) {
    return <AffiliatePublicPageWithUsername username={username} />;
  }

  // Otherwise, render the normal app routes
  return <>{children}</>;
}

/**
 * Wrapper to pass username as prop instead of URL param
 */
function AffiliatePublicPageWithUsername({ username }: { username: string }) {
  // We need to mock the useParams behavior since we're not using the router
  // The AffiliatePublicPage uses useParams, so we'll render it with a context override
  return (
    <AffiliatePublicPageDirect username={username} />
  );
}

/**
 * Direct render of affiliate public page content with username prop
 */
import { useNavigate } from 'react-router-dom';
import { useAffiliateContext } from '@/hooks/useAffiliateContext';
import { storeAffiliateAttribution } from '@/utils/affiliateAttribution';
import { RequestDemoForm } from '@/components/affiliate/RequestDemoForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  UserCheck, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Clock, 
  Shield,
  Zap,
  Users,
  ArrowRight
} from 'lucide-react';

function AffiliatePublicPageDirect({ username }: { username: string }) {
  const navigate = useNavigate();
  const { affiliate, isLoading, notFound, error } = useAffiliateContext(username);

  useEffect(() => {
    if (affiliate?.id) {
      storeAffiliateAttribution(affiliate.id);
    }
  }, [affiliate?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (notFound || !affiliate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <UserCheck className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Representative Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              We couldn't find a representative with the username "{username}".
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-destructive">Something Went Wrong</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const benefits = [
    {
      icon: Phone,
      title: 'AI Phone Answering',
      description: 'Never miss a call. AI handles inbound calls 24/7 with natural conversation.',
    },
    {
      icon: MessageSquare,
      title: 'Website Chat & Voice',
      description: 'Engage visitors instantly with AI chat and voice widgets on your site.',
    },
    {
      icon: Calendar,
      title: 'Appointment Booking',
      description: 'Automatically capture leads and book appointments while you focus on work.',
    },
    {
      icon: Clock,
      title: 'Always Available',
      description: 'Your AI assistant works around the clock - nights, weekends, holidays.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">E</span>
            </div>
            <span className="text-xl font-semibold">EverLaunch AI</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Rep: <span className="font-medium text-foreground">{affiliate.username}</span>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                24/7 AI Phone, Web & Chat Assistant for Your Business
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Transform how you engage customers with AI that answers calls, chats with website visitors, 
                and books appointments — all while you sleep.
              </p>
              
              <div className="mb-8">
                <Button 
                  size="lg" 
                  onClick={() => navigate(`/buy?ref=${affiliate.username}`)}
                  className="w-full sm:w-auto"
                >
                  Get Started Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Or request a personalized demo below →
                </p>
              </div>

              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Enterprise-grade AI</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Setup in minutes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Trusted by 500+ businesses</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit) => (
                  <div 
                    key={benefit.title}
                    className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <benefit.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{benefit.title}</h3>
                        <p className="text-sm text-muted-foreground">{benefit.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:sticky lg:top-24">
              <RequestDemoForm 
                affiliateId={affiliate.id} 
                affiliateUsername={affiliate.username} 
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card/50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">
              Stop Losing Leads to Missed Calls
            </h2>
            <p className="text-muted-foreground mb-8">
              Every missed call is a missed opportunity. With EverLaunch AI, your business 
              is always ready to engage customers, capture leads, and book appointments — 
              even when you're busy or off the clock.
            </p>
            <div className="grid sm:grid-cols-3 gap-8">
              <div>
                <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                <div className="text-sm text-muted-foreground">Always Available</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2">&lt;2s</div>
                <div className="text-sm text-muted-foreground">Response Time</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2">95%</div>
                <div className="text-sm text-muted-foreground">Customer Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} EverLaunch AI. All rights reserved.</p>
          <p className="mt-2">
            Your representative: <span className="font-medium">{affiliate.username}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
