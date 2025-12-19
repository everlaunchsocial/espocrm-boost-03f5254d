-- Create vertical_training table for industry vertical training content
CREATE TABLE public.vertical_training (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rank integer NOT NULL UNIQUE,
  industry_name text NOT NULL,
  video_path text NULL,
  why_priority jsonb NOT NULL DEFAULT '[]'::jsonb,
  pain_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  why_phone_ai_fits jsonb NOT NULL DEFAULT '[]'::jsonb,
  where_to_find jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vertical_training ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to SELECT
CREATE POLICY "vertical_training_select_authenticated"
ON public.vertical_training
FOR SELECT
TO authenticated
USING (true);

-- Allow only admin/super_admin to INSERT
CREATE POLICY "vertical_training_insert_admin"
ON public.vertical_training
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Allow only admin/super_admin to UPDATE
CREATE POLICY "vertical_training_update_admin"
ON public.vertical_training
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Allow only admin/super_admin to DELETE
CREATE POLICY "vertical_training_delete_admin"
ON public.vertical_training
FOR DELETE
TO authenticated
USING (is_admin());

-- Create updated_at trigger
CREATE TRIGGER update_vertical_training_updated_at
BEFORE UPDATE ON public.vertical_training
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create private storage bucket for training videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-videos', 'training-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: only authenticated users can read
CREATE POLICY "training_videos_select_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'training-videos');

-- Only admins can upload/modify training videos
CREATE POLICY "training_videos_insert_admin"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'training-videos' AND is_admin());

CREATE POLICY "training_videos_update_admin"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'training-videos' AND is_admin());

CREATE POLICY "training_videos_delete_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'training-videos' AND is_admin());

-- Seed example data for top 20 verticals
INSERT INTO public.vertical_training (rank, industry_name, video_path, why_priority, pain_points, why_phone_ai_fits, where_to_find) VALUES
(1, 'Plumbing Services', NULL, 
  '["Emergency calls drive revenue - 40% of plumbing calls are urgent", "High ticket services ($200-$500 average)", "24/7 availability is expected but costly to staff", "Local market with less competition for AI solutions"]'::jsonb,
  '["Missing after-hours emergency calls", "Scheduling conflicts and double-bookings", "High cost of 24/7 dispatcher staffing", "Inconsistent customer service quality"]'::jsonb,
  '["Captures emergency calls 24/7 without added payroll", "Books appointments directly into their calendar", "Qualifies leads before dispatching technicians", "Consistent, professional response every time"]'::jsonb,
  '["Google Maps search for local plumbers", "HomeAdvisor and Angi contractor lists", "Local Facebook business groups", "Plumbing trade association directories"]'::jsonb
),
(2, 'HVAC Services', NULL,
  '["Seasonal demand creates call volume spikes", "Emergency services command premium pricing", "Complex scheduling needs", "High customer lifetime value"]'::jsonb,
  '["Overwhelmed during peak seasons", "Missing emergency heating/cooling calls", "Difficulty scheduling maintenance appointments", "Customer frustration with hold times"]'::jsonb,
  '["Handles call surges without added staff", "Triages emergency vs routine calls", "Schedules maintenance windows efficiently", "Provides instant quotes for common services"]'::jsonb,
  '["HVAC contractor directories", "Local chamber of commerce", "Trade show exhibitor lists", "Equipment supplier referrals"]'::jsonb
),
(3, 'Electrical Contractors', NULL,
  '["Safety-critical services require immediate response", "Mix of residential and commercial clients", "Permit and inspection scheduling complexity", "Growing demand from EV charger installations"]'::jsonb,
  '["Emergency calls after business hours", "Complex job scoping over phone", "Permit coordination challenges", "Keeping up with EV installation inquiries"]'::jsonb,
  '["24/7 emergency call handling", "Preliminary job scoping and quotes", "Appointment scheduling with permit timelines", "EV charger inquiry qualification"]'::jsonb,
  '["Electrical contractor associations", "Local utility company referral lists", "Commercial property managers", "EV dealership partnerships"]'::jsonb
),
(4, 'Roofing Companies', NULL,
  '["Storm damage creates urgent call spikes", "High-value projects ($5K-$20K average)", "Seasonal business with planning needs", "Insurance claim coordination required"]'::jsonb,
  '["Overwhelmed after major storms", "Missing leads during busy season", "Insurance claim communication delays", "Difficulty scheduling inspections"]'::jsonb,
  '["Captures storm-related call surges", "Schedules free inspections efficiently", "Collects insurance claim information upfront", "Follows up on pending estimates"]'::jsonb,
  '["Storm chaser networks (legitimate)", "Insurance adjuster referrals", "Real estate agent partnerships", "HOA management companies"]'::jsonb
),
(5, 'Dental Practices', NULL,
  '["High patient lifetime value ($10K+)", "Appointment-driven revenue model", "Complex scheduling with multiple providers", "Patient retention is critical"]'::jsonb,
  '["No-shows and last-minute cancellations", "After-hours emergency calls", "New patient inquiry conversion", "Recall appointment scheduling"]'::jsonb,
  '["Reduces no-shows with confirmations", "Handles dental emergencies after hours", "Converts new patient inquiries", "Automates recall reminders"]'::jsonb,
  '["Dental association member lists", "Dental supply company connections", "Healthcare networking events", "LinkedIn dental practice groups"]'::jsonb
),
(6, 'Medical Practices', NULL,
  '["Essential service with consistent demand", "Complex multi-provider scheduling", "Patient communication requirements", "Regulatory compliance needs"]'::jsonb,
  '["High call volume during office hours", "After-hours patient concerns", "Prescription refill requests", "Appointment scheduling bottlenecks"]'::jsonb,
  '["Handles routine inquiries automatically", "Triages after-hours calls appropriately", "Manages prescription refill requests", "Books appointments across providers"]'::jsonb,
  '["Medical society directories", "Healthcare conferences", "Medical office building managers", "Practice management consultants"]'::jsonb
),
(7, 'Law Firms', NULL,
  '["High-value client acquisition ($5K-$50K+ cases)", "Time-sensitive legal matters", "Client confidentiality requirements", "Competitive intake process"]'::jsonb,
  '["Missing potential client calls", "After-hours inquiry handling", "Initial case screening time", "Client communication management"]'::jsonb,
  '["Never misses a potential client call", "Performs initial case screening", "Schedules consultations efficiently", "Maintains professional responsiveness"]'::jsonb,
  '["State bar association lists", "Legal marketing conferences", "Law firm management groups", "Courthouse networking"]'::jsonb
),
(8, 'Real Estate Agencies', NULL,
  '["High commission per transaction", "Time-sensitive buyer/seller inquiries", "Property showing coordination", "Lead nurturing is critical"]'::jsonb,
  '["Missing buyer inquiry calls", "Showing scheduling complexity", "Lead follow-up inconsistency", "After-hours property questions"]'::jsonb,
  '["Captures every buyer inquiry", "Schedules property showings", "Qualifies leads automatically", "Provides property information 24/7"]'::jsonb,
  '["MLS association events", "Real estate broker networks", "Property management companies", "Mortgage broker partnerships"]'::jsonb
),
(9, 'Auto Repair Shops', NULL,
  '["Consistent vehicle service demand", "Emergency roadside situations", "Service appointment scheduling", "Customer trust is paramount"]'::jsonb,
  '["Phone interruptions during repairs", "Missed calls while working on cars", "Service scheduling inefficiency", "Customer update requests"]'::jsonb,
  '["Answers calls while techs work", "Schedules service appointments", "Provides repair status updates", "Handles roadside assistance calls"]'::jsonb,
  '["Automotive trade associations", "Auto parts supplier networks", "Car dealership connections", "Insurance company referrals"]'::jsonb
),
(10, 'Veterinary Clinics', NULL,
  '["Pet owners are highly engaged", "Emergency pet care needs", "Appointment-based revenue", "Multiple service types"]'::jsonb,
  '["Emergency calls after hours", "Appointment scheduling demand", "Prescription refill requests", "New client intake process"]'::jsonb,
  '["Handles pet emergency triage", "Schedules routine appointments", "Manages medication refills", "Onboards new pet patients"]'::jsonb,
  '["Veterinary medical associations", "Pet supply store partnerships", "Animal shelter connections", "Pet insurance company referrals"]'::jsonb
),
(11, 'Insurance Agencies', NULL,
  '["Policy renewals create predictable cycles", "Quote requests need quick response", "Claims require immediate attention", "Cross-selling opportunities"]'::jsonb,
  '["Quote request response time", "Claims intake after hours", "Policy question volume", "Renewal reminder calls"]'::jsonb,
  '["Captures quote requests instantly", "Initiates claims intake 24/7", "Answers common policy questions", "Automates renewal reminders"]'::jsonb,
  '["Insurance carrier agent lists", "Industry conferences", "Chamber of commerce", "Financial advisor networks"]'::jsonb
),
(12, 'Bail Bonds', 'rank-12-bail-bonds/v1.mp4',
  '["24/7 urgent service requirement", "Time-sensitive legal situations", "High emotional stress calls", "Immediate response expected"]'::jsonb,
  '["Must answer calls at 3 AM", "High stress caller situations", "Jail information coordination", "Payment processing needs"]'::jsonb,
  '["Never misses an urgent call", "Calms distressed callers professionally", "Collects essential information", "Initiates payment processing"]'::jsonb,
  '["Court house vicinity businesses", "Criminal defense attorney referrals", "Jail facility connections", "Legal aid organizations"]'::jsonb
),
(13, 'Pest Control', NULL,
  '["Emergency pest situations", "Seasonal demand patterns", "Recurring service model", "Health and safety concerns"]'::jsonb,
  '["Urgent infestation calls", "Seasonal call volume spikes", "Recurring service scheduling", "After-hours emergencies"]'::jsonb,
  '["Handles emergency pest calls", "Manages seasonal demand", "Schedules recurring treatments", "Books inspections efficiently"]'::jsonb,
  '["Pest control associations", "Property management companies", "Real estate agent referrals", "Restaurant industry connections"]'::jsonb
),
(14, 'Landscaping Services', NULL,
  '["Seasonal business with planning needs", "Recurring maintenance contracts", "Weather-dependent scheduling", "Commercial account opportunities"]'::jsonb,
  '["Seasonal call management", "Weather reschedule coordination", "Estimate request handling", "Contract renewal follow-up"]'::jsonb,
  '["Manages seasonal inquiries", "Handles weather reschedules", "Schedules free estimates", "Follows up on renewals"]'::jsonb,
  '["Landscape contractor associations", "Garden center partnerships", "HOA management companies", "Commercial property managers"]'::jsonb
),
(15, 'Cleaning Services', NULL,
  '["Recurring revenue model", "Last-minute booking requests", "Quality assurance needs", "Commercial growth potential"]'::jsonb,
  '["Same-day booking requests", "Cleaner scheduling complexity", "Customer feedback collection", "Commercial inquiry handling"]'::jsonb,
  '["Handles last-minute bookings", "Manages cleaner schedules", "Collects service feedback", "Qualifies commercial leads"]'::jsonb,
  '["Cleaning industry associations", "Property management networks", "Real estate staging companies", "Airbnb host groups"]'::jsonb
),
(16, 'Moving Companies', NULL,
  '["High-value transactions", "Quote request volume", "Seasonal demand peaks", "Complex scheduling needs"]'::jsonb,
  '["Quote request overload", "Moving date coordination", "Last-minute booking changes", "Long-distance inquiry handling"]'::jsonb,
  '["Captures all quote requests", "Confirms moving dates", "Manages schedule changes", "Qualifies long-distance moves"]'::jsonb,
  '["Moving industry associations", "Real estate agent partnerships", "Corporate relocation departments", "Apartment complex managers"]'::jsonb
),
(17, 'Towing Services', NULL,
  '["24/7 emergency requirement", "Time-critical situations", "Insurance company relationships", "Multi-service offerings"]'::jsonb,
  '["Round-the-clock dispatch needs", "High stress caller situations", "Insurance coordination", "Location information accuracy"]'::jsonb,
  '["24/7 emergency dispatch", "Calms stressed callers", "Coordinates with insurance", "Captures accurate locations"]'::jsonb,
  '["Auto club partnerships", "Insurance company referrals", "Police department connections", "Parking enforcement contracts"]'::jsonb
),
(18, 'Pool Services', NULL,
  '["Seasonal maintenance revenue", "Emergency repair calls", "Chemical balance inquiries", "Equipment upgrade sales"]'::jsonb,
  '["Seasonal opening/closing demand", "Emergency pump failures", "Chemical question calls", "Service scheduling complexity"]'::jsonb,
  '["Manages seasonal demand", "Handles emergency repairs", "Answers maintenance questions", "Schedules regular service"]'::jsonb,
  '["Pool industry associations", "Real estate agents", "HOA managers", "Pool supply stores"]'::jsonb
),
(19, 'Funeral Homes', NULL,
  '["24/7 immediate need service", "Highly sensitive situations", "Complex arrangement process", "Pre-planning opportunities"]'::jsonb,
  '["Immediate death notification calls", "Extremely sensitive situations", "After-hours arrangement needs", "Pre-planning inquiries"]'::jsonb,
  '["Compassionate 24/7 response", "Sensitive caller handling", "Initiates arrangement process", "Schedules pre-planning meetings"]'::jsonb,
  '["Funeral director associations", "Hospice partnerships", "Hospital social workers", "Elder care facilities"]'::jsonb
),
(20, 'Property Management', NULL,
  '["Recurring management fees", "Tenant emergency calls", "Maintenance coordination", "Owner communication needs"]'::jsonb,
  '["After-hours tenant emergencies", "Maintenance request volume", "Showing scheduling", "Owner update demands"]'::jsonb,
  '["Handles tenant emergencies", "Logs maintenance requests", "Schedules property showings", "Provides owner updates"]'::jsonb,
  '["Property management associations", "Real estate investor groups", "Landlord networks", "Commercial real estate brokers"]'::jsonb
);