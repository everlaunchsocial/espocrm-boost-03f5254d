import { Building2, Phone, Mail, MapPin, Clock, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BusinessInfo {
  businessName: string;
  title: string;
  description: string;
  phones: string[];
  emails: string[];
  services: string[];
  address: string;
  hours: string;
  url: string;
}

interface BusinessInfoCardProps {
  businessInfo: BusinessInfo | null;
  isLoading?: boolean;
}

export const BusinessInfoCard = ({ businessInfo, isLoading }: BusinessInfoCardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse bg-muted rounded" />
            <div className="h-6 w-48 animate-pulse bg-muted rounded" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-full animate-pulse bg-muted rounded" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!businessInfo) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            Enter a website URL above to extract business information
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          {businessInfo.businessName}
        </CardTitle>
        {businessInfo.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {businessInfo.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Services */}
        {businessInfo.services.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Services
            </div>
            <div className="flex flex-wrap gap-1.5">
              {businessInfo.services.map((service, i) => (
                <Badge key={i} variant="secondary" className="capitalize">
                  {service}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Contact Info */}
        {businessInfo.phones.length > 0 && (
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              {businessInfo.phones.map((phone, i) => (
                <p key={i} className="text-sm">{phone}</p>
              ))}
            </div>
          </div>
        )}

        {businessInfo.emails.length > 0 && (
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              {businessInfo.emails.map((email, i) => (
                <p key={i} className="text-sm">{email}</p>
              ))}
            </div>
          </div>
        )}

        {businessInfo.address && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-sm">{businessInfo.address}</p>
          </div>
        )}

        {businessInfo.hours && (
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-sm">{businessInfo.hours}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
