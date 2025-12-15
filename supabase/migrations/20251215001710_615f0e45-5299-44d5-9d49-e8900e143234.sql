
-- Step 1: Get the user_id to keep (info@everlaunch.ai)
-- We'll delete everything else

-- Clean up service_usage (no FK, just orphaned data)
DELETE FROM service_usage WHERE customer_id NOT IN (
  SELECT id FROM customer_profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up vapi_calls
DELETE FROM vapi_calls WHERE customer_id NOT IN (
  SELECT id FROM customer_profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up call_analysis
DELETE FROM call_analysis WHERE customer_id NOT IN (
  SELECT id FROM customer_profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up billing_usage
DELETE FROM billing_usage WHERE customer_id NOT IN (
  SELECT id FROM customer_profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up customer_phone_numbers
DELETE FROM customer_phone_numbers WHERE customer_id NOT IN (
  SELECT id FROM customer_profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up voice_settings
DELETE FROM voice_settings WHERE customer_id NOT IN (
  SELECT id FROM customer_profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up chat_settings
DELETE FROM chat_settings WHERE customer_id NOT IN (
  SELECT id FROM customer_profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up calendar_integrations
DELETE FROM calendar_integrations WHERE customer_id NOT IN (
  SELECT id FROM customer_profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up customer_knowledge_sources
DELETE FROM customer_knowledge_sources WHERE customer_id NOT IN (
  SELECT id FROM customer_profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up billing_subscriptions
DELETE FROM billing_subscriptions WHERE customer_id NOT IN (
  SELECT id FROM customer_profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up affiliate_commissions (references affiliates)
DELETE FROM affiliate_commissions WHERE affiliate_id NOT IN (
  SELECT id FROM affiliates WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up genealogy
DELETE FROM genealogy WHERE affiliate_id NOT IN (
  SELECT id FROM affiliates WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up affiliate_billing_history
DELETE FROM affiliate_billing_history WHERE affiliate_id NOT IN (
  SELECT id FROM affiliates WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up affiliate_credit_purchases
DELETE FROM affiliate_credit_purchases WHERE affiliate_id NOT IN (
  SELECT id FROM affiliates WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up affiliate_plan_history
DELETE FROM affiliate_plan_history WHERE affiliate_id NOT IN (
  SELECT id FROM affiliates WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up payouts
DELETE FROM payouts WHERE affiliate_id NOT IN (
  SELECT id FROM affiliates WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
  )
);

-- Clean up customer_profiles (before affiliates due to FK)
DELETE FROM customer_profiles WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
);

-- Clean up affiliates
DELETE FROM affiliates WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
);

-- Clean up profiles
DELETE FROM profiles WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'info@everlaunch.ai'
);

-- Step 2: Add CASCADE DELETE constraints
-- Drop existing FKs and recreate with CASCADE

-- profiles -> auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- affiliates -> auth.users
ALTER TABLE affiliates DROP CONSTRAINT IF EXISTS affiliates_user_id_fkey;
ALTER TABLE affiliates ADD CONSTRAINT affiliates_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- customer_profiles -> auth.users
ALTER TABLE customer_profiles DROP CONSTRAINT IF EXISTS customer_profiles_user_id_fkey;
ALTER TABLE customer_profiles ADD CONSTRAINT customer_profiles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- customer_profiles -> affiliates (SET NULL on delete, not cascade)
ALTER TABLE customer_profiles DROP CONSTRAINT IF EXISTS customer_profiles_affiliate_id_fkey;
ALTER TABLE customer_profiles ADD CONSTRAINT customer_profiles_affiliate_id_fkey 
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE SET NULL;

-- voice_settings -> customer_profiles
ALTER TABLE voice_settings DROP CONSTRAINT IF EXISTS voice_settings_customer_id_fkey;
ALTER TABLE voice_settings ADD CONSTRAINT voice_settings_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;

-- chat_settings -> customer_profiles
ALTER TABLE chat_settings DROP CONSTRAINT IF EXISTS chat_settings_customer_id_fkey;
ALTER TABLE chat_settings ADD CONSTRAINT chat_settings_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;

-- customer_phone_numbers -> customer_profiles
ALTER TABLE customer_phone_numbers DROP CONSTRAINT IF EXISTS customer_phone_numbers_customer_id_fkey;
ALTER TABLE customer_phone_numbers ADD CONSTRAINT customer_phone_numbers_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;

-- calendar_integrations -> customer_profiles
ALTER TABLE calendar_integrations DROP CONSTRAINT IF EXISTS calendar_integrations_customer_id_fkey;
ALTER TABLE calendar_integrations ADD CONSTRAINT calendar_integrations_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;

-- customer_knowledge_sources -> customer_profiles
ALTER TABLE customer_knowledge_sources DROP CONSTRAINT IF EXISTS customer_knowledge_sources_customer_id_fkey;
ALTER TABLE customer_knowledge_sources ADD CONSTRAINT customer_knowledge_sources_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;

-- billing_subscriptions -> customer_profiles
ALTER TABLE billing_subscriptions DROP CONSTRAINT IF EXISTS billing_subscriptions_customer_id_fkey;
ALTER TABLE billing_subscriptions ADD CONSTRAINT billing_subscriptions_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;

-- billing_usage -> customer_profiles
ALTER TABLE billing_usage DROP CONSTRAINT IF EXISTS billing_usage_customer_id_fkey;
ALTER TABLE billing_usage ADD CONSTRAINT billing_usage_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;

-- vapi_calls -> customer_profiles
ALTER TABLE vapi_calls DROP CONSTRAINT IF EXISTS vapi_calls_customer_id_fkey;
ALTER TABLE vapi_calls ADD CONSTRAINT vapi_calls_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;

-- call_analysis -> customer_profiles
ALTER TABLE call_analysis DROP CONSTRAINT IF EXISTS call_analysis_customer_id_fkey;
ALTER TABLE call_analysis ADD CONSTRAINT call_analysis_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;

-- service_usage -> customer_profiles (nullable, so SET NULL)
ALTER TABLE service_usage DROP CONSTRAINT IF EXISTS service_usage_customer_id_fkey;
ALTER TABLE service_usage ADD CONSTRAINT service_usage_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE SET NULL;

-- affiliate_commissions -> affiliates
ALTER TABLE affiliate_commissions DROP CONSTRAINT IF EXISTS affiliate_commissions_affiliate_id_fkey;
ALTER TABLE affiliate_commissions ADD CONSTRAINT affiliate_commissions_affiliate_id_fkey 
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE;

-- genealogy -> affiliates
ALTER TABLE genealogy DROP CONSTRAINT IF EXISTS genealogy_affiliate_id_fkey;
ALTER TABLE genealogy ADD CONSTRAINT genealogy_affiliate_id_fkey 
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE;

-- affiliate_billing_history -> affiliates
ALTER TABLE affiliate_billing_history DROP CONSTRAINT IF EXISTS affiliate_billing_history_affiliate_id_fkey;
ALTER TABLE affiliate_billing_history ADD CONSTRAINT affiliate_billing_history_affiliate_id_fkey 
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE;

-- affiliate_credit_purchases -> affiliates
ALTER TABLE affiliate_credit_purchases DROP CONSTRAINT IF EXISTS affiliate_credit_purchases_affiliate_id_fkey;
ALTER TABLE affiliate_credit_purchases ADD CONSTRAINT affiliate_credit_purchases_affiliate_id_fkey 
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE;

-- affiliate_plan_history -> affiliates
ALTER TABLE affiliate_plan_history DROP CONSTRAINT IF EXISTS affiliate_plan_history_affiliate_id_fkey;
ALTER TABLE affiliate_plan_history ADD CONSTRAINT affiliate_plan_history_affiliate_id_fkey 
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE;

-- payouts -> affiliates
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_affiliate_id_fkey;
ALTER TABLE payouts ADD CONSTRAINT payouts_affiliate_id_fkey 
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE;

-- billing_subscriptions -> affiliates (nullable, SET NULL)
ALTER TABLE billing_subscriptions DROP CONSTRAINT IF EXISTS billing_subscriptions_affiliate_id_fkey;
ALTER TABLE billing_subscriptions ADD CONSTRAINT billing_subscriptions_affiliate_id_fkey 
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE SET NULL;
