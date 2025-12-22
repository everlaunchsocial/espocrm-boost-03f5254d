import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  user_id: string;
  global_role: string;
  email: string;
}

export function useCRMTeamMembers() {
  return useQuery({
    queryKey: ['crm-team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_crm_team_members');

      if (error) throw error;
      return (data || []) as TeamMember[];
    },
  });
}
