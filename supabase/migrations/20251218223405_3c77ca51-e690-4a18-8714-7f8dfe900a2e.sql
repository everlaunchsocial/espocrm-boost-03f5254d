
-- Create test_suites table to store predefined test suite definitions
CREATE TABLE public.test_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  steps JSONB NOT NULL DEFAULT '[]',
  estimated_duration_minutes INTEGER,
  prerequisites TEXT[],
  test_credentials JSONB DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create test_runs table to track individual test executions
CREATE TABLE public.test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id UUID NOT NULL REFERENCES public.test_suites(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'passed', 'failed', 'abandoned')),
  tester_user_id UUID,
  current_step_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create test_step_completions table to track individual step results
CREATE TABLE public.test_step_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  step_id TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'skip')),
  notes TEXT,
  screenshot_url TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_test_runs_suite_id ON public.test_runs(suite_id);
CREATE INDEX idx_test_runs_status ON public.test_runs(status);
CREATE INDEX idx_test_step_completions_run_id ON public.test_step_completions(run_id);

-- Enable RLS
ALTER TABLE public.test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_step_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies - super_admin only
CREATE POLICY "test_suites_super_admin_all" ON public.test_suites
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "test_runs_super_admin_all" ON public.test_runs
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "test_step_completions_super_admin_all" ON public.test_step_completions
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Add updated_at trigger for test_suites
CREATE TRIGGER update_test_suites_updated_at
  BEFORE UPDATE ON public.test_suites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the predefined test suites
INSERT INTO public.test_suites (name, description, category, position, estimated_duration_minutes, test_credentials, steps) VALUES
(
  'Demo-to-Signup Flow',
  'Tests the complete demo experience from /sales page to lead capture',
  'demo',
  1,
  15,
  '{"email": "demo1@test.com", "password": "123Yourstreet!"}',
  '[
    {"id": "open-sales", "title": "Open /sales page in incognito browser", "instruction": "Open a new incognito/private browser window and navigate to /sales", "expected": "Sales page loads with hero section visible"},
    {"id": "verify-hero", "title": "Verify hero section loads with video background", "instruction": "Check that the hero section displays correctly with the video background", "expected": "Video background is playing, headline and CTA buttons visible"},
    {"id": "click-demo", "title": "Click \"Try AI Demo\" button", "instruction": "Click on the Try AI Demo or similar CTA button", "expected": "Demo chat widget appears"},
    {"id": "test-chat", "title": "Test chat interaction", "instruction": "Type \"I need help with missed calls\" in the chat", "expected": "AI responds with relevant information about handling missed calls"},
    {"id": "test-voice", "title": "Click Voice tab and test voice interaction", "instruction": "Switch to the Voice tab and test speaking to the AI", "expected": "Voice interface activates and AI responds to voice input"},
    {"id": "test-call", "title": "Click Call tab and verify phone card", "instruction": "Switch to the Call tab", "expected": "Phone card displays with call option"},
    {"id": "enter-name", "title": "Enter contact name", "instruction": "Enter \"Test Demo\" as the name", "expected": "Name field accepts input"},
    {"id": "enter-email", "title": "Enter contact email", "instruction": "Enter \"demo1@test.com\" as the email", "expected": "Email field accepts input"},
    {"id": "submit-request", "title": "Click Request Demo button", "instruction": "Click the Request Demo or Submit button", "expected": "Success message appears confirming demo request"},
    {"id": "verify-db", "title": "Verify lead in database", "instruction": "Check database: SELECT * FROM leads WHERE email = ''demo1@test.com''", "expected": "Lead record exists with correct information"},
    {"id": "verify-affiliate", "title": "Verify lead in affiliate leads list", "instruction": "If ref= was used, login as that affiliate and check Leads page", "expected": "Lead appears in affiliate''s lead list"}
  ]'
),
(
  'Customer Complete Journey',
  'Tests full customer signup, payment, and onboarding through the customer portal',
  'customer',
  2,
  45,
  '{"email": "customer1@test.com", "password": "123Yourstreet!", "business_name": "Test Business LLC", "stripe_test_card": "4242 4242 4242 4242"}',
  '[
    {"id": "navigate-buy", "title": "Navigate to /buy", "instruction": "Go to the /buy page", "expected": "Buy page loads showing 3 plan options"},
    {"id": "verify-plans", "title": "Verify 3 plans display", "instruction": "Check that Starter ($149), Growth ($249), Professional ($399) plans show", "expected": "All 3 plans visible with correct pricing"},
    {"id": "select-growth", "title": "Click Select Plan on Growth", "instruction": "Click the Select Plan button on the Growth plan ($249)", "expected": "Signup form appears"},
    {"id": "fill-business", "title": "Fill in Business Name", "instruction": "Enter \"Test Business LLC\"", "expected": "Business name field populated"},
    {"id": "fill-name", "title": "Fill in First/Last Name", "instruction": "Enter \"Test\" and \"Customer\"", "expected": "Name fields populated"},
    {"id": "fill-email", "title": "Fill in Email", "instruction": "Enter \"customer1@test.com\"", "expected": "Email field populated"},
    {"id": "fill-phone", "title": "Fill in Phone", "instruction": "Enter \"555-123-4567\"", "expected": "Phone field populated"},
    {"id": "fill-website", "title": "Fill in Website (optional)", "instruction": "Enter \"https://testbusiness.com\"", "expected": "Website field populated"},
    {"id": "click-continue", "title": "Click Continue", "instruction": "Click the Continue button", "expected": "Confirmation screen appears"},
    {"id": "complete-signup", "title": "Click Complete Signup", "instruction": "Click Complete Signup button", "expected": "Redirects to Stripe Checkout"},
    {"id": "stripe-payment", "title": "Complete Stripe payment", "instruction": "Use test card 4242 4242 4242 4242, any future date, any CVV", "expected": "Payment processes successfully"},
    {"id": "verify-redirect", "title": "Verify redirect to success", "instruction": "After payment, should redirect to success page", "expected": "Success page shows with next steps"},
    {"id": "verify-db-customer", "title": "Verify customer_profiles record", "instruction": "Check database for customer record", "expected": "customer_profiles record exists with Growth plan"},
    {"id": "login-customer", "title": "Login at /auth", "instruction": "Login with customer1@test.com", "expected": "Login successful"},
    {"id": "verify-onboarding-redirect", "title": "Verify redirect to onboarding", "instruction": "After login should go to /customer/onboarding/step-1", "expected": "Onboarding step 1 loads"},
    {"id": "onboarding-step1", "title": "Complete Step 1 - Business Info", "instruction": "Verify business info pre-filled, click Continue", "expected": "Moves to step 2"},
    {"id": "onboarding-step2", "title": "Complete Step 2 - Business Hours", "instruction": "Set business hours Mon-Fri 9am-5pm, click Continue", "expected": "Moves to step 3"},
    {"id": "onboarding-step3", "title": "Complete Step 3 - Voice Settings", "instruction": "Select voice, set greeting, click Continue", "expected": "Moves to step 4"},
    {"id": "onboarding-step4", "title": "Complete Step 4 - Knowledge Base", "instruction": "Enter FAQ or upload doc, click Continue", "expected": "Moves to step 5"},
    {"id": "onboarding-step5", "title": "Complete Step 5 - Lead Capture", "instruction": "Configure lead settings, click Continue", "expected": "Moves to step 6"},
    {"id": "onboarding-step6", "title": "Complete Step 6 - Review", "instruction": "Review settings, click Complete", "expected": "Redirects to Customer Dashboard"},
    {"id": "verify-dashboard", "title": "Verify Customer Dashboard loads", "instruction": "Check dashboard displays correctly", "expected": "Dashboard shows with setup checklist"},
    {"id": "test-menu-items", "title": "Test all menu items load", "instruction": "Click through Dashboard, Leads, Insights, AI Preview, Settings", "expected": "All pages load without errors"},
    {"id": "test-ai-preview", "title": "Test AI Preview chat", "instruction": "Go to AI Preview and chat with configured AI", "expected": "AI responds based on configured settings"},
    {"id": "verify-usage", "title": "Verify usage dashboard", "instruction": "Check usage shows correct plan details", "expected": "Plan name, minutes included visible"}
  ]'
),
(
  'Affiliate Signup & Avatar (Jimmy)',
  'Tests first affiliate signup under super admin including avatar and video creation',
  'affiliate',
  3,
  60,
  '{"username": "jimmy", "email": "affiliate1@test.com", "password": "123Yourstreet!", "plan": "Basic ($29)"}',
  '[
    {"id": "navigate-join", "title": "Navigate to /join?ref=everlaunch", "instruction": "Go to /join?ref=everlaunch", "expected": "Join page loads with referral info"},
    {"id": "verify-referral", "title": "Verify \"Referred by everlaunch\" shows", "instruction": "Check referral attribution displays", "expected": "Referred by everlaunch visible"},
    {"id": "fill-firstname", "title": "Fill First Name: Jimmy", "instruction": "Enter \"Jimmy\" in first name", "expected": "First name populated"},
    {"id": "fill-lastname", "title": "Fill Last Name: Tester", "instruction": "Enter \"Tester\" in last name", "expected": "Last name populated"},
    {"id": "fill-username", "title": "Fill Username: jimmy", "instruction": "Enter \"jimmy\" and verify checkmark", "expected": "Username available checkmark shows"},
    {"id": "fill-email", "title": "Fill Email", "instruction": "Enter \"affiliate1@test.com\"", "expected": "Email populated"},
    {"id": "fill-password", "title": "Fill Password", "instruction": "Enter \"123Yourstreet!\"", "expected": "Password populated"},
    {"id": "fill-phone", "title": "Fill Phone", "instruction": "Enter \"555-111-1111\"", "expected": "Phone populated"},
    {"id": "check-disclaimer", "title": "Check earnings disclaimer", "instruction": "Check the earnings disclaimer checkbox", "expected": "Checkbox checked"},
    {"id": "select-basic", "title": "Click Get Started on Basic plan", "instruction": "Click Get Started on Basic plan ($29)", "expected": "Redirects to Stripe"},
    {"id": "complete-payment", "title": "Complete Stripe payment", "instruction": "Use test card to complete payment", "expected": "Payment successful"},
    {"id": "verify-dashboard", "title": "Verify redirect to affiliate dashboard", "instruction": "After payment should redirect to dashboard", "expected": "Affiliate dashboard loads"},
    {"id": "navigate-videos", "title": "Navigate to Videos page", "instruction": "Click Videos in sidebar", "expected": "Videos page loads"},
    {"id": "click-create-avatar", "title": "Click Create Avatar Profile", "instruction": "Click the Create Avatar Profile button", "expected": "Avatar creation wizard opens"},
    {"id": "avatar-step1", "title": "Step 1: Review requirements", "instruction": "Read requirements, click Next", "expected": "Moves to step 2"},
    {"id": "avatar-step2", "title": "Step 2: Upload 5 photos", "instruction": "Upload 5 headshot photos", "expected": "Photos upload successfully"},
    {"id": "avatar-step3", "title": "Step 3: Upload voice recording", "instruction": "Upload 1+ minute MP3 voice recording", "expected": "Voice file uploads successfully"},
    {"id": "avatar-step4", "title": "Step 4: Create AI Avatar", "instruction": "Click Create AI Avatar button", "expected": "Avatar creation starts"},
    {"id": "verify-training", "title": "Verify profile status shows Training", "instruction": "Check avatar profile status", "expected": "Status shows Training"},
    {"id": "wait-training", "title": "Wait for training to complete (10-30 min)", "instruction": "Wait and periodically refresh", "expected": "Status changes to Ready"},
    {"id": "click-generate", "title": "Click Generate Video on template", "instruction": "Click Generate Video on Client Video template", "expected": "Video generation starts"},
    {"id": "verify-generating", "title": "Verify video status shows Generating", "instruction": "Check video status", "expected": "Status shows Generating"},
    {"id": "wait-video", "title": "Wait for video to complete", "instruction": "Wait and periodically refresh", "expected": "Status changes to Ready"},
    {"id": "copy-link", "title": "Click Copy Link on completed video", "instruction": "Click Copy Link button", "expected": "Link copied to clipboard"},
    {"id": "test-landing", "title": "Verify landing page URL works", "instruction": "Open the copied URL in new tab", "expected": "Video landing page loads and plays"},
    {"id": "verify-genealogy", "title": "Verify Jimmy in genealogy under everlaunch", "instruction": "Login as super admin, go to /admin/genealogy", "expected": "Jimmy appears under everlaunch in tree"}
  ]'
),
(
  'Multi-Level Genealogy Tree',
  'Tests 5-affiliate tree structure with multiple levels and all plan tiers',
  'affiliate',
  4,
  30,
  '{"affiliates": [{"username": "sarah", "email": "affiliate2@test.com", "sponsor": "jimmy", "plan": "Agency $299"}, {"username": "henry", "email": "affiliate3@test.com", "sponsor": "sarah", "plan": "Pro $99"}, {"username": "joe", "email": "affiliate5@test.com", "sponsor": "sarah", "plan": "Basic $29"}, {"username": "sally", "email": "affiliate4@test.com", "sponsor": "henry", "plan": "Free $0"}]}',
  '[
    {"id": "sarah-navigate", "title": "Navigate to /join?ref=jimmy", "instruction": "Go to /join?ref=jimmy", "expected": "Join page with Referred by jimmy"},
    {"id": "sarah-create", "title": "Create Sarah account", "instruction": "First: Sarah, Last: Tester, Username: sarah, Email: affiliate2@test.com", "expected": "Form filled"},
    {"id": "sarah-plan", "title": "Select Agency plan ($299)", "instruction": "Click Get Started on Agency plan", "expected": "Redirects to Stripe"},
    {"id": "sarah-pay", "title": "Complete Stripe checkout", "instruction": "Complete payment with test card", "expected": "Payment successful"},
    {"id": "sarah-verify", "title": "Verify Sarah under Jimmy in genealogy", "instruction": "Check genealogy tree", "expected": "Sarah shows under Jimmy"},
    {"id": "henry-navigate", "title": "Navigate to /join?ref=sarah", "instruction": "Go to /join?ref=sarah", "expected": "Join page with Referred by sarah"},
    {"id": "henry-create", "title": "Create Henry account", "instruction": "Username: henry, Email: affiliate3@test.com", "expected": "Form filled"},
    {"id": "henry-plan", "title": "Select Pro plan ($99)", "instruction": "Click Get Started on Pro plan", "expected": "Redirects to Stripe"},
    {"id": "henry-pay", "title": "Complete Stripe checkout", "instruction": "Complete payment", "expected": "Payment successful"},
    {"id": "henry-verify", "title": "Verify Henry under Sarah in genealogy", "instruction": "Check genealogy tree", "expected": "Henry shows under Sarah"},
    {"id": "joe-navigate", "title": "Navigate to /join?ref=sarah", "instruction": "Go to /join?ref=sarah", "expected": "Join page with Referred by sarah"},
    {"id": "joe-create", "title": "Create Joe account", "instruction": "Username: joe, Email: affiliate5@test.com", "expected": "Form filled"},
    {"id": "joe-plan", "title": "Select Basic plan ($29)", "instruction": "Click Get Started on Basic plan", "expected": "Redirects to Stripe"},
    {"id": "joe-pay", "title": "Complete Stripe checkout", "instruction": "Complete payment", "expected": "Payment successful"},
    {"id": "joe-verify", "title": "Verify Joe under Sarah (sibling of Henry)", "instruction": "Check genealogy tree", "expected": "Joe shows under Sarah next to Henry"},
    {"id": "sally-navigate", "title": "Navigate to /join?ref=henry", "instruction": "Go to /join?ref=henry", "expected": "Join page with Referred by henry"},
    {"id": "sally-create", "title": "Create Sally account", "instruction": "Username: sally, Email: affiliate4@test.com", "expected": "Form filled"},
    {"id": "sally-plan", "title": "Select Free plan ($0)", "instruction": "Click Get Started on Free plan", "expected": "No Stripe redirect"},
    {"id": "sally-verify-no-stripe", "title": "Verify NO Stripe checkout for free plan", "instruction": "Should redirect directly to dashboard", "expected": "Affiliate dashboard loads"},
    {"id": "sally-verify-genealogy", "title": "Verify Sally under Henry in genealogy", "instruction": "Check genealogy tree", "expected": "Sally shows under Henry"},
    {"id": "tree-superadmin", "title": "Login as Super Admin", "instruction": "Login with super admin account", "expected": "Login successful"},
    {"id": "tree-navigate", "title": "Navigate to /admin/genealogy", "instruction": "Go to Admin → Genealogy", "expected": "Genealogy tree loads"},
    {"id": "tree-expand", "title": "Expand all nodes", "instruction": "Click to expand all tree nodes", "expected": "Full tree visible"},
    {"id": "tree-verify-structure", "title": "Verify tree matches expected structure", "instruction": "everlaunch → Jimmy → Sarah → (Henry, Joe), Henry → Sally", "expected": "Tree structure matches diagram"},
    {"id": "tree-verify-counts", "title": "Verify tier counts", "instruction": "Jimmy: 1 direct, Sarah: 2 direct, Henry: 1 direct", "expected": "Counts match expected"}
  ]'
),
(
  'Commission Verification',
  'Verifies commission calculations for the 5-affiliate tree',
  'commission',
  5,
  20,
  '{"commission_rates": {"level1": 0.30, "level2": 0.15, "level3": 0.05}}',
  '[
    {"id": "login-jimmy", "title": "Login as Jimmy (affiliate1@test.com)", "instruction": "Login with affiliate1@test.com / 123Yourstreet!", "expected": "Login successful"},
    {"id": "navigate-commissions-jimmy", "title": "Navigate to Commissions page", "instruction": "Go to Commissions in sidebar", "expected": "Commissions page loads"},
    {"id": "verify-jimmy-sarah", "title": "Verify $89.70 from Sarah (L1)", "instruction": "Check commission from Sarah signup", "expected": "$89.70 commission shows (30% of $299)"},
    {"id": "verify-jimmy-henry", "title": "Verify $14.85 from Henry (L2)", "instruction": "Check commission from Henry signup", "expected": "$14.85 commission shows (15% of $99)"},
    {"id": "verify-jimmy-joe", "title": "Verify $4.35 from Joe (L2)", "instruction": "Check commission from Joe signup", "expected": "$4.35 commission shows (15% of $29)"},
    {"id": "verify-jimmy-total", "title": "Verify Jimmy total: $108.90", "instruction": "Check total pending commissions", "expected": "Total is $108.90"},
    {"id": "login-sarah", "title": "Login as Sarah (affiliate2@test.com)", "instruction": "Login with affiliate2@test.com / 123Yourstreet!", "expected": "Login successful"},
    {"id": "navigate-commissions-sarah", "title": "Navigate to Commissions page", "instruction": "Go to Commissions in sidebar", "expected": "Commissions page loads"},
    {"id": "verify-sarah-henry", "title": "Verify $29.70 from Henry (L1)", "instruction": "Check commission from Henry signup", "expected": "$29.70 commission shows (30% of $99)"},
    {"id": "verify-sarah-joe", "title": "Verify $8.70 from Joe (L1)", "instruction": "Check commission from Joe signup", "expected": "$8.70 commission shows (30% of $29)"},
    {"id": "verify-sarah-total", "title": "Verify Sarah total: $38.40", "instruction": "Check total pending commissions", "expected": "Total is $38.40"},
    {"id": "login-superadmin", "title": "Login as Super Admin", "instruction": "Login with super admin credentials", "expected": "Login successful"},
    {"id": "navigate-admin-payouts", "title": "Navigate to Admin → Payouts", "instruction": "Go to Admin → Payouts or Commissions view", "expected": "Admin payouts page loads"},
    {"id": "verify-superadmin-jimmy", "title": "Verify $8.70 from Jimmy (L1)", "instruction": "Check commission from Jimmy signup", "expected": "$8.70 shows (30% of $29)"},
    {"id": "verify-superadmin-sarah", "title": "Verify $44.85 from Sarah (L2)", "instruction": "Check commission from Sarah signup", "expected": "$44.85 shows (15% of $299)"},
    {"id": "verify-superadmin-henry", "title": "Verify $4.95 from Henry (L3)", "instruction": "Check commission from Henry signup", "expected": "$4.95 shows (5% of $99)"},
    {"id": "verify-superadmin-joe", "title": "Verify $1.45 from Joe (L3)", "instruction": "Check commission from Joe signup", "expected": "$1.45 shows (5% of $29)"},
    {"id": "verify-superadmin-total", "title": "Verify Super Admin total: $59.95", "instruction": "Check total pending commissions", "expected": "Total is $59.95"},
    {"id": "verify-total-all", "title": "Verify total commissions match expected", "instruction": "Sum all pending: $108.90 + $38.40 + $59.95 = $207.25", "expected": "Total system commissions match"}
  ]'
);
