-- Add subscription management fields to customer_profiles
ALTER TABLE public.customer_profiles
ADD COLUMN IF NOT EXISTS subscription_type text NOT NULL DEFAULT 'paying',
ADD COLUMN IF NOT EXISTS complimentary_reason text,
ADD COLUMN IF NOT EXISTS complimentary_granted_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS complimentary_granted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS complimentary_expires_at timestamp with time zone;

-- Add check constraint for subscription_type
ALTER TABLE public.customer_profiles
ADD CONSTRAINT customer_profiles_subscription_type_check 
CHECK (subscription_type IN ('paying', 'complimentary', 'trial'));

-- Add index for finding complimentary accounts
CREATE INDEX IF NOT EXISTS idx_customer_profiles_subscription_type 
ON public.customer_profiles(subscription_type);

-- Add index for expiration check
CREATE INDEX IF NOT EXISTS idx_customer_profiles_complimentary_expires 
ON public.customer_profiles(complimentary_expires_at) 
WHERE complimentary_expires_at IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.customer_profiles.subscription_type IS 'Type of subscription: paying, complimentary, or trial';
COMMENT ON COLUMN public.customer_profiles.complimentary_reason IS 'Reason for complimentary access (if applicable)';
COMMENT ON COLUMN public.customer_profiles.complimentary_granted_by IS 'Admin user who granted complimentary access';
COMMENT ON COLUMN public.customer_profiles.complimentary_granted_at IS 'Timestamp when complimentary access was granted';
COMMENT ON COLUMN public.customer_profiles.complimentary_expires_at IS 'Optional expiration date for complimentary access';