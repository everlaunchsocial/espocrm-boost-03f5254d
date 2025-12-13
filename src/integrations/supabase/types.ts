export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          address: string | null
          city: string | null
          company_email: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          name: string
          phone: string | null
          state: string | null
          type: string
          updated_at: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_email?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name: string
          phone?: string | null
          state?: string | null
          type?: string
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_email?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          type?: string
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      activities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system_generated: boolean | null
          related_to_id: string | null
          related_to_name: string | null
          related_to_type: string | null
          subject: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_generated?: boolean | null
          related_to_id?: string | null
          related_to_name?: string | null
          related_to_type?: string | null
          subject: string
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_generated?: boolean | null
          related_to_id?: string | null
          related_to_name?: string | null
          related_to_type?: string | null
          subject?: string
          type?: string
        }
        Relationships: []
      }
      affiliate_billing_history: {
        Row: {
          affiliate_id: string
          amount_cents: number
          created_at: string | null
          description: string
          id: string
          invoice_pdf_url: string | null
          status: string | null
          stripe_invoice_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount_cents: number
          created_at?: string | null
          description: string
          id?: string
          invoice_pdf_url?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          created_at?: string | null
          description?: string
          id?: string
          invoice_pdf_url?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_billing_history_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount: number
          commission_level: number
          created_at: string
          customer_id: string
          id: string
          paid_at: string | null
          status: string
        }
        Insert: {
          affiliate_id: string
          amount?: number
          commission_level: number
          created_at?: string
          customer_id: string
          id?: string
          paid_at?: string | null
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          commission_level?: number
          created_at?: string
          customer_id?: string
          id?: string
          paid_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_minutes_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "affiliate_commissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_credit_purchases: {
        Row: {
          affiliate_id: string
          amount_cents: number
          credits_purchased: number
          id: string
          purchased_at: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount_cents: number
          credits_purchased: number
          id?: string
          purchased_at?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          credits_purchased?: number
          id?: string
          purchased_at?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_credit_purchases_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_plan_history: {
        Row: {
          affiliate_id: string
          changed_at: string | null
          id: string
          initiated_by: string | null
          new_plan_code: string
          new_plan_id: string
          old_plan_code: string | null
          old_plan_id: string | null
          proration_amount_cents: number | null
          stripe_subscription_id: string | null
        }
        Insert: {
          affiliate_id: string
          changed_at?: string | null
          id?: string
          initiated_by?: string | null
          new_plan_code: string
          new_plan_id: string
          old_plan_code?: string | null
          old_plan_id?: string | null
          proration_amount_cents?: number | null
          stripe_subscription_id?: string | null
        }
        Update: {
          affiliate_id?: string
          changed_at?: string | null
          id?: string
          initiated_by?: string | null
          new_plan_code?: string
          new_plan_id?: string
          old_plan_code?: string | null
          old_plan_id?: string | null
          proration_amount_cents?: number | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_plan_history_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_plan_history_new_plan_id_fkey"
            columns: ["new_plan_id"]
            isOneToOne: false
            referencedRelation: "affiliate_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_plan_history_old_plan_id_fkey"
            columns: ["old_plan_id"]
            isOneToOne: false
            referencedRelation: "affiliate_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_plans: {
        Row: {
          code: string
          created_at: string | null
          demo_credits_per_month: number | null
          id: string
          is_active: boolean
          monthly_price: number
          name: string
          stripe_price_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          demo_credits_per_month?: number | null
          id?: string
          is_active?: boolean
          monthly_price: number
          name: string
          stripe_price_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          demo_credits_per_month?: number | null
          id?: string
          is_active?: boolean
          monthly_price?: number
          name?: string
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          affiliate_plan_id: string | null
          billing_cycle_start: string | null
          commission_plan_id: string | null
          created_at: string
          demo_credits_balance: number | null
          demo_credits_remaining: number | null
          demo_credits_reset_at: string | null
          demo_credits_used_this_month: number | null
          id: string
          parent_affiliate_id: string | null
          user_id: string
          username: string
        }
        Insert: {
          affiliate_plan_id?: string | null
          billing_cycle_start?: string | null
          commission_plan_id?: string | null
          created_at?: string
          demo_credits_balance?: number | null
          demo_credits_remaining?: number | null
          demo_credits_reset_at?: string | null
          demo_credits_used_this_month?: number | null
          id?: string
          parent_affiliate_id?: string | null
          user_id: string
          username: string
        }
        Update: {
          affiliate_plan_id?: string | null
          billing_cycle_start?: string | null
          commission_plan_id?: string | null
          created_at?: string
          demo_credits_balance?: number | null
          demo_credits_remaining?: number | null
          demo_credits_reset_at?: string | null
          demo_credits_used_this_month?: number | null
          id?: string
          parent_affiliate_id?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_affiliate_plan_id_fkey"
            columns: ["affiliate_plan_id"]
            isOneToOne: false
            referencedRelation: "affiliate_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliates_commission_plan_id_fkey"
            columns: ["commission_plan_id"]
            isOneToOne: false
            referencedRelation: "commission_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_subscriptions: {
        Row: {
          affiliate_id: string | null
          created_at: string
          customer_id: string
          id: string
          plan_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_type: string | null
        }
        Insert: {
          affiliate_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: string | null
        }
        Update: {
          affiliate_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_subscriptions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_minutes_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "billing_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_usage: {
        Row: {
          amount: number
          customer_id: string
          id: string
          timestamp: string
          usage_type: string
        }
        Insert: {
          amount?: number
          customer_id: string
          id?: string
          timestamp?: string
          usage_type: string
        }
        Update: {
          amount?: number
          customer_id?: string
          id?: string
          timestamp?: string
          usage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_minutes_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "billing_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_bookings: {
        Row: {
          booking_date: string
          booking_time: string
          created_at: string
          demo_id: string | null
          id: string
          notes: string | null
          prospect_email: string
          prospect_name: string
          prospect_phone: string | null
          status: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          booking_date: string
          booking_time: string
          created_at?: string
          demo_id?: string | null
          id?: string
          notes?: string | null
          prospect_email: string
          prospect_name: string
          prospect_phone?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          booking_date?: string
          booking_time?: string
          created_at?: string
          demo_id?: string | null
          id?: string
          notes?: string | null
          prospect_email?: string
          prospect_name?: string
          prospect_phone?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_bookings_demo_id_fkey"
            columns: ["demo_id"]
            isOneToOne: false
            referencedRelation: "demos"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_integrations: {
        Row: {
          access_token: string | null
          appointments_enabled: boolean | null
          availability_json: Json | null
          created_at: string
          customer_id: string
          id: string
          provider: string | null
          refresh_token: string | null
          send_reminders: boolean | null
          slot_length_minutes: number | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          appointments_enabled?: boolean | null
          availability_json?: Json | null
          created_at?: string
          customer_id: string
          id?: string
          provider?: string | null
          refresh_token?: string | null
          send_reminders?: boolean | null
          slot_length_minutes?: number | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          appointments_enabled?: boolean | null
          availability_json?: Json | null
          created_at?: string
          customer_id?: string
          id?: string
          provider?: string | null
          refresh_token?: string | null
          send_reminders?: boolean | null
          slot_length_minutes?: number | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_integrations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_minutes_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "calendar_integrations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_analysis: {
        Row: {
          analysis_cost: number | null
          analyzed_at: string
          analyzer_model: string | null
          call_category: string | null
          call_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          insights: Json | null
          overall_score: number | null
          score_accuracy: number | null
          score_booking_success: number | null
          score_call_duration: number | null
          score_clarity: number | null
          score_completeness: number | null
          score_lead_quality: number | null
          score_objection_handling: number | null
          score_outcome_quality: number | null
          score_speed: number | null
          score_tone: number | null
          sentiment: string | null
          suggestions: Json | null
          transcript_summary: string | null
        }
        Insert: {
          analysis_cost?: number | null
          analyzed_at?: string
          analyzer_model?: string | null
          call_category?: string | null
          call_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          insights?: Json | null
          overall_score?: number | null
          score_accuracy?: number | null
          score_booking_success?: number | null
          score_call_duration?: number | null
          score_clarity?: number | null
          score_completeness?: number | null
          score_lead_quality?: number | null
          score_objection_handling?: number | null
          score_outcome_quality?: number | null
          score_speed?: number | null
          score_tone?: number | null
          sentiment?: string | null
          suggestions?: Json | null
          transcript_summary?: string | null
        }
        Update: {
          analysis_cost?: number | null
          analyzed_at?: string
          analyzer_model?: string | null
          call_category?: string | null
          call_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          insights?: Json | null
          overall_score?: number | null
          score_accuracy?: number | null
          score_booking_success?: number | null
          score_call_duration?: number | null
          score_clarity?: number | null
          score_completeness?: number | null
          score_lead_quality?: number | null
          score_objection_handling?: number | null
          score_outcome_quality?: number | null
          score_speed?: number | null
          score_tone?: number | null
          sentiment?: string | null
          suggestions?: Json | null
          transcript_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_analysis_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "vapi_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_analysis_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_minutes_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "call_analysis_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          action_items: Json | null
          contact_id: string | null
          created_at: string
          duration_seconds: number | null
          entity_type: string
          id: string
          lead_id: string | null
          suggested_email: Json | null
          suggested_status: string | null
          summary: string | null
          transcript: string
        }
        Insert: {
          action_items?: Json | null
          contact_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          entity_type: string
          id?: string
          lead_id?: string | null
          suggested_email?: Json | null
          suggested_status?: string | null
          summary?: string | null
          transcript: string
        }
        Update: {
          action_items?: Json | null
          contact_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          entity_type?: string
          id?: string
          lead_id?: string | null
          suggested_email?: Json | null
          suggested_status?: string | null
          summary?: string | null
          transcript?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_settings: {
        Row: {
          customer_id: string
          greeting_text: string | null
          id: string
          instructions: string | null
          tone: string | null
          updated_at: string
          use_uploaded_docs: boolean | null
          use_website_knowledge: boolean | null
        }
        Insert: {
          customer_id: string
          greeting_text?: string | null
          id?: string
          instructions?: string | null
          tone?: string | null
          updated_at?: string
          use_uploaded_docs?: boolean | null
          use_website_knowledge?: boolean | null
        }
        Update: {
          customer_id?: string
          greeting_text?: string | null
          id?: string
          instructions?: string | null
          tone?: string | null
          updated_at?: string
          use_uploaded_docs?: boolean | null
          use_website_knowledge?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_minutes_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "chat_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_plans: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          level1_rate: number
          level2_rate: number
          level3_rate: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          level1_rate?: number
          level2_rate?: number
          level3_rate?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          level1_rate?: number
          level2_rate?: number
          level3_rate?: number
          name?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          account_id: string | null
          affiliate_id: string | null
          cell_phone: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          secondary_contact_email: string | null
          secondary_contact_name: string | null
          secondary_contact_phone: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          affiliate_id?: string | null
          cell_phone?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          secondary_contact_email?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          affiliate_id?: string | null
          cell_phone?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          secondary_contact_email?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_knowledge_sources: {
        Row: {
          created_at: string
          customer_id: string
          file_name: string | null
          id: string
          source_type: string
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          file_name?: string | null
          id?: string
          source_type?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          file_name?: string | null
          id?: string
          source_type?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_knowledge_sources_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_minutes_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_knowledge_sources_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_phone_numbers: {
        Row: {
          area_code: string | null
          created_at: string
          customer_id: string
          id: string
          phone_number: string
          status: string
          updated_at: string
          vapi_account_id: string | null
          vapi_assistant_id: string | null
          vapi_phone_id: string | null
        }
        Insert: {
          area_code?: string | null
          created_at?: string
          customer_id: string
          id?: string
          phone_number: string
          status?: string
          updated_at?: string
          vapi_account_id?: string | null
          vapi_assistant_id?: string | null
          vapi_phone_id?: string | null
        }
        Update: {
          area_code?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          phone_number?: string
          status?: string
          updated_at?: string
          vapi_account_id?: string | null
          vapi_assistant_id?: string | null
          vapi_phone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_phone_numbers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_minutes_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_phone_numbers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_phone_numbers_vapi_account_id_fkey"
            columns: ["vapi_account_id"]
            isOneToOne: false
            referencedRelation: "vapi_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_plans: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean
          minutes_included: number
          monthly_price: number
          name: string
          overage_rate: number
          setup_fee: number
          stripe_price_id: string | null
          stripe_setup_price_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          minutes_included: number
          monthly_price: number
          name: string
          overage_rate: number
          setup_fee: number
          stripe_price_id?: string | null
          stripe_setup_price_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          minutes_included?: number
          monthly_price?: number
          name?: string
          overage_rate?: number
          setup_fee?: number
          stripe_price_id?: string | null
          stripe_setup_price_id?: string | null
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          additional_notification_emails: string[] | null
          additional_notification_phones: string[] | null
          affiliate_id: string | null
          after_hours_behavior: string | null
          billing_cycle_end: string | null
          billing_cycle_start: string | null
          business_hours: Json | null
          business_name: string | null
          business_type: string | null
          contact_name: string | null
          created_at: string
          customer_plan_id: string | null
          customer_timezone: string | null
          embed_installed_at: string | null
          id: string
          lead_capture_enabled: boolean | null
          lead_email: string | null
          lead_sms_number: string | null
          lead_sources_enabled: Json | null
          minutes_included: number
          minutes_used: number
          onboarding_completed_at: string | null
          onboarding_current_step: number | null
          onboarding_stage: string | null
          overage_rate: number
          phone: string | null
          phone_tested_at: string | null
          plan_name: string | null
          sms_notifications_enabled: boolean | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          additional_notification_emails?: string[] | null
          additional_notification_phones?: string[] | null
          affiliate_id?: string | null
          after_hours_behavior?: string | null
          billing_cycle_end?: string | null
          billing_cycle_start?: string | null
          business_hours?: Json | null
          business_name?: string | null
          business_type?: string | null
          contact_name?: string | null
          created_at?: string
          customer_plan_id?: string | null
          customer_timezone?: string | null
          embed_installed_at?: string | null
          id?: string
          lead_capture_enabled?: boolean | null
          lead_email?: string | null
          lead_sms_number?: string | null
          lead_sources_enabled?: Json | null
          minutes_included?: number
          minutes_used?: number
          onboarding_completed_at?: string | null
          onboarding_current_step?: number | null
          onboarding_stage?: string | null
          overage_rate?: number
          phone?: string | null
          phone_tested_at?: string | null
          plan_name?: string | null
          sms_notifications_enabled?: boolean | null
          user_id: string
          website_url?: string | null
        }
        Update: {
          additional_notification_emails?: string[] | null
          additional_notification_phones?: string[] | null
          affiliate_id?: string | null
          after_hours_behavior?: string | null
          billing_cycle_end?: string | null
          billing_cycle_start?: string | null
          business_hours?: Json | null
          business_name?: string | null
          business_type?: string | null
          contact_name?: string | null
          created_at?: string
          customer_plan_id?: string | null
          customer_timezone?: string | null
          embed_installed_at?: string | null
          id?: string
          lead_capture_enabled?: boolean | null
          lead_email?: string | null
          lead_sms_number?: string | null
          lead_sources_enabled?: Json | null
          minutes_included?: number
          minutes_used?: number
          onboarding_completed_at?: string | null
          onboarding_current_step?: number | null
          onboarding_stage?: string | null
          overage_rate?: number
          phone?: string | null
          phone_tested_at?: string | null
          plan_name?: string | null
          sms_notifications_enabled?: boolean | null
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profiles_customer_plan_id_fkey"
            columns: ["customer_plan_id"]
            isOneToOne: false
            referencedRelation: "customer_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          account_id: string | null
          amount: number
          contact_id: string | null
          created_at: string
          expected_close_date: string | null
          id: string
          name: string
          probability: number
          stage: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          contact_id?: string | null
          created_at?: string
          expected_close_date?: string | null
          id?: string
          name: string
          probability?: number
          stage?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          contact_id?: string | null
          created_at?: string
          expected_close_date?: string | null
          id?: string
          name?: string
          probability?: number
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      demos: {
        Row: {
          affiliate_id: string | null
          ai_persona_name: string | null
          ai_prompt: string | null
          avatar_url: string | null
          business_name: string
          chat_interaction_count: number
          chat_primary_color: string | null
          chat_title: string | null
          contact_id: string | null
          converted_at: string | null
          created_at: string
          elevenlabs_agent_id: string | null
          email_sent_at: string | null
          first_viewed_at: string | null
          id: string
          last_viewed_at: string | null
          lead_id: string | null
          passcode: string | null
          rep_id: string | null
          screenshot_url: string | null
          status: string
          updated_at: string
          vapi_assistant_id: string | null
          view_count: number
          voice_interaction_count: number
          voice_provider: string
          website_url: string | null
        }
        Insert: {
          affiliate_id?: string | null
          ai_persona_name?: string | null
          ai_prompt?: string | null
          avatar_url?: string | null
          business_name: string
          chat_interaction_count?: number
          chat_primary_color?: string | null
          chat_title?: string | null
          contact_id?: string | null
          converted_at?: string | null
          created_at?: string
          elevenlabs_agent_id?: string | null
          email_sent_at?: string | null
          first_viewed_at?: string | null
          id?: string
          last_viewed_at?: string | null
          lead_id?: string | null
          passcode?: string | null
          rep_id?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          vapi_assistant_id?: string | null
          view_count?: number
          voice_interaction_count?: number
          voice_provider?: string
          website_url?: string | null
        }
        Update: {
          affiliate_id?: string | null
          ai_persona_name?: string | null
          ai_prompt?: string | null
          avatar_url?: string | null
          business_name?: string
          chat_interaction_count?: number
          chat_primary_color?: string | null
          chat_title?: string | null
          contact_id?: string | null
          converted_at?: string | null
          created_at?: string
          elevenlabs_agent_id?: string | null
          email_sent_at?: string | null
          first_viewed_at?: string | null
          id?: string
          last_viewed_at?: string | null
          lead_id?: string | null
          passcode?: string | null
          rep_id?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          vapi_assistant_id?: string | null
          view_count?: number
          voice_interaction_count?: number
          voice_provider?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demos_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demos_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          body: string
          contact_id: string
          created_at: string
          id: string
          open_count: number
          opened_at: string | null
          sender_address: string
          sender_name: string | null
          sent_at: string
          status: string
          subject: string
          to_email: string
          to_name: string | null
          tracking_id: string
        }
        Insert: {
          body: string
          contact_id: string
          created_at?: string
          id?: string
          open_count?: number
          opened_at?: string | null
          sender_address: string
          sender_name?: string | null
          sent_at?: string
          status?: string
          subject: string
          to_email: string
          to_name?: string | null
          tracking_id?: string
        }
        Update: {
          body?: string
          contact_id?: string
          created_at?: string
          id?: string
          open_count?: number
          opened_at?: string | null
          sender_address?: string
          sender_name?: string | null
          sent_at?: string
          status?: string
          subject?: string
          to_email?: string
          to_name?: string | null
          tracking_id?: string
        }
        Relationships: []
      }
      estimate_items: {
        Row: {
          created_at: string
          description: string
          estimate_id: string
          id: string
          line_total: number
          quantity: number
          sort_order: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          estimate_id: string
          id?: string
          line_total?: number
          quantity?: number
          sort_order?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          estimate_id?: string
          id?: string
          line_total?: number
          quantity?: number
          sort_order?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          accepted_at: string | null
          after_photo_url: string | null
          before_photo_url: string | null
          contact_id: string | null
          created_at: string
          customer_address: string | null
          customer_city: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          customer_state: string | null
          customer_zip: string | null
          declined_at: string | null
          deposit_amount: number | null
          deposit_required: boolean | null
          deposit_type: string | null
          during_photo_url: string | null
          estimate_number: string
          id: string
          invoice_generated: boolean | null
          job_description: string | null
          job_title: string
          lead_id: string | null
          notes: string | null
          sent_at: string | null
          signature_data: string | null
          signer_ip: string | null
          signer_name: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          terms_and_conditions: string | null
          total_amount: number
          updated_at: string
          valid_until: string | null
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          after_photo_url?: string | null
          before_photo_url?: string | null
          contact_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_city?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_state?: string | null
          customer_zip?: string | null
          declined_at?: string | null
          deposit_amount?: number | null
          deposit_required?: boolean | null
          deposit_type?: string | null
          during_photo_url?: string | null
          estimate_number: string
          id?: string
          invoice_generated?: boolean | null
          job_description?: string | null
          job_title: string
          lead_id?: string | null
          notes?: string | null
          sent_at?: string | null
          signature_data?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms_and_conditions?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          after_photo_url?: string | null
          before_photo_url?: string | null
          contact_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_city?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_state?: string | null
          customer_zip?: string | null
          declined_at?: string | null
          deposit_amount?: number | null
          deposit_required?: boolean | null
          deposit_type?: string | null
          during_photo_url?: string | null
          estimate_number?: string
          id?: string
          invoice_generated?: boolean | null
          job_description?: string | null
          job_title?: string
          lead_id?: string | null
          notes?: string | null
          sent_at?: string | null
          signature_data?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms_and_conditions?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      genealogy: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          upline_level1: string | null
          upline_level2: string | null
          upline_level3: string | null
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          upline_level1?: string | null
          upline_level2?: string | null
          upline_level3?: string | null
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          upline_level1?: string | null
          upline_level2?: string | null
          upline_level3?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "genealogy_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: true
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genealogy_upline_level1_fkey"
            columns: ["upline_level1"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genealogy_upline_level2_fkey"
            columns: ["upline_level2"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genealogy_upline_level3_fkey"
            columns: ["upline_level3"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          impersonated_affiliate_id: string
          impersonated_username: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          impersonated_affiliate_id: string
          impersonated_username: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          impersonated_affiliate_id?: string
          impersonated_username?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_logs_impersonated_affiliate_id_fkey"
            columns: ["impersonated_affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          discount_amount: number | null
          discount_type: string | null
          id: string
          invoice_id: string
          line_total: number
          quantity: number
          sort_order: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          discount_amount?: number | null
          discount_type?: string | null
          id?: string
          invoice_id: string
          line_total?: number
          quantity?: number
          sort_order?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          discount_amount?: number | null
          discount_type?: string | null
          id?: string
          invoice_id?: string
          line_total?: number
          quantity?: number
          sort_order?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          after_photo_url: string | null
          amount_paid: number | null
          before_photo_url: string | null
          contact_id: string | null
          created_at: string
          customer_address: string | null
          customer_city: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          customer_state: string | null
          customer_zip: string | null
          due_date: string | null
          during_photo_url: string | null
          estimate_id: string | null
          id: string
          invoice_number: string
          job_description: string | null
          job_title: string
          lead_id: string | null
          notes: string | null
          paid_date: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          after_photo_url?: string | null
          amount_paid?: number | null
          before_photo_url?: string | null
          contact_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_city?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_state?: string | null
          customer_zip?: string | null
          due_date?: string | null
          during_photo_url?: string | null
          estimate_id?: string | null
          id?: string
          invoice_number: string
          job_description?: string | null
          job_title: string
          lead_id?: string | null
          notes?: string | null
          paid_date?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          after_photo_url?: string | null
          amount_paid?: number | null
          before_photo_url?: string | null
          contact_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_city?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_state?: string | null
          customer_zip?: string | null
          due_date?: string | null
          during_photo_url?: string | null
          estimate_id?: string | null
          id?: string
          invoice_number?: string
          job_description?: string | null
          job_title?: string
          lead_id?: string | null
          notes?: string | null
          paid_date?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          affiliate_id: string | null
          city: string | null
          company: string | null
          created_at: string
          email: string | null
          facebook_url: string | null
          first_name: string
          google_rating: number | null
          google_review_count: number | null
          has_website: boolean | null
          id: string
          import_batch_id: string | null
          industry: string | null
          instagram_handle: string | null
          last_name: string
          notes: string | null
          phone: string | null
          pipeline_status: string
          service_category: string | null
          source: string
          state: string | null
          status: string
          title: string | null
          updated_at: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          affiliate_id?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          first_name: string
          google_rating?: number | null
          google_review_count?: number | null
          has_website?: boolean | null
          id?: string
          import_batch_id?: string | null
          industry?: string | null
          instagram_handle?: string | null
          last_name: string
          notes?: string | null
          phone?: string | null
          pipeline_status?: string
          service_category?: string | null
          source?: string
          state?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          affiliate_id?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          first_name?: string
          google_rating?: number | null
          google_review_count?: number | null
          has_website?: boolean | null
          id?: string
          import_batch_id?: string | null
          industry?: string | null
          instagram_handle?: string | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          pipeline_status?: string
          service_category?: string | null
          source?: string
          state?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          created_at: string
          description: string | null
          id: string
          keywords: string[] | null
          name: string
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          name: string
          type?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          name?: string
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          related_to_id: string
          related_to_name: string
          related_to_type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          related_to_id: string
          related_to_name: string
          related_to_type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          related_to_id?: string
          related_to_name?: string
          related_to_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          affiliate_id: string
          amount: number
          id: string
          method: string | null
          paid_at: string
          period_end: string
          period_start: string
        }
        Insert: {
          affiliate_id: string
          amount?: number
          id?: string
          method?: string | null
          paid_at?: string
          period_end: string
          period_start: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          id?: string
          method?: string | null
          paid_at?: string
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          global_role: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          global_role?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          global_role?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sender_addresses: {
        Row: {
          created_at: string
          email: string
          id: string
          is_default: boolean
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_default?: boolean
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_default?: boolean
          name?: string
        }
        Relationships: []
      }
      service_usage: {
        Row: {
          affiliate_id: string | null
          call_type: string | null
          cost_breakdown: Json | null
          cost_usd: number | null
          created_at: string | null
          customer_id: string | null
          demo_id: string | null
          duration_seconds: number | null
          id: string
          message_count: number | null
          metadata: Json | null
          model: string | null
          provider: string
          reference_id: string | null
          session_id: string | null
          tokens_in: number | null
          tokens_out: number | null
          usage_type: string
        }
        Insert: {
          affiliate_id?: string | null
          call_type?: string | null
          cost_breakdown?: Json | null
          cost_usd?: number | null
          created_at?: string | null
          customer_id?: string | null
          demo_id?: string | null
          duration_seconds?: number | null
          id?: string
          message_count?: number | null
          metadata?: Json | null
          model?: string | null
          provider: string
          reference_id?: string | null
          session_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          usage_type: string
        }
        Update: {
          affiliate_id?: string | null
          call_type?: string | null
          cost_breakdown?: Json | null
          cost_usd?: number | null
          created_at?: string | null
          customer_id?: string | null
          demo_id?: string | null
          duration_seconds?: number | null
          id?: string
          message_count?: number | null
          metadata?: Json | null
          model?: string | null
          provider?: string
          reference_id?: string | null
          session_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          usage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_usage_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_minutes_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "service_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_usage_demo_id_fkey"
            columns: ["demo_id"]
            isOneToOne: false
            referencedRelation: "demos"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_events: {
        Row: {
          created_at: string | null
          email: string | null
          event_name: string
          id: string
          plan: string | null
          referrer: string | null
          referrer_affiliate_id: string | null
          step: string | null
          username: string | null
          viewed_by_affiliate: boolean | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          event_name: string
          id?: string
          plan?: string | null
          referrer?: string | null
          referrer_affiliate_id?: string | null
          step?: string | null
          username?: string | null
          viewed_by_affiliate?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          event_name?: string
          id?: string
          plan?: string | null
          referrer?: string | null
          referrer_affiliate_id?: string | null
          step?: string | null
          username?: string | null
          viewed_by_affiliate?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "signup_events_referrer_affiliate_id_fkey"
            columns: ["referrer_affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          priority: string
          related_to_id: string | null
          related_to_name: string | null
          related_to_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          priority?: string
          related_to_id?: string | null
          related_to_name?: string | null
          related_to_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          priority?: string
          related_to_id?: string | null
          related_to_name?: string | null
          related_to_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      training_modules: {
        Row: {
          category_id: string | null
          content_body: string | null
          content_type: string
          content_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_published: boolean | null
          is_required: boolean | null
          sort_order: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          content_body?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          is_required?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          content_body?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          is_required?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_modules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "training_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      training_progress: {
        Row: {
          affiliate_id: string
          completed_at: string | null
          created_at: string
          id: string
          last_position_seconds: number | null
          module_id: string
          progress_percent: number | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          last_position_seconds?: number | null
          module_id: string
          progress_percent?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          last_position_seconds?: number | null
          module_id?: string
          progress_percent?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      twilio_numbers: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          status: string
          twilio_number: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          status?: string
          twilio_number: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          status?: string
          twilio_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "twilio_numbers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_minutes_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "twilio_numbers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          current_value: number | null
          entity_id: string
          entity_type: string
          id: string
          message: string | null
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          threshold_value: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          current_value?: number | null
          entity_id: string
          entity_type: string
          id?: string
          message?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          threshold_value?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          current_value?: number | null
          entity_id?: string
          entity_type?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          threshold_value?: number | null
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          interaction_type: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          interaction_type: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          interaction_type?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_minutes_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vapi_accounts: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          max_numbers: number
          name: string
          numbers_provisioned: number
          updated_at: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_numbers?: number
          name: string
          numbers_provisioned?: number
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_numbers?: number
          name?: string
          numbers_provisioned?: number
          updated_at?: string
        }
        Relationships: []
      }
      vapi_calls: {
        Row: {
          affiliate_id: string | null
          assistant_id: string | null
          call_metadata: Json | null
          call_type: string | null
          caller_phone: string | null
          cost_llm: number | null
          cost_platform: number | null
          cost_stt: number | null
          cost_total: number | null
          cost_transport: number | null
          cost_tts: number | null
          created_at: string
          customer_id: string | null
          demo_id: string | null
          duration_seconds: number | null
          ended_reason: string | null
          id: string
          recording_url: string | null
          summary: string | null
          transcript: string | null
          vapi_call_id: string | null
        }
        Insert: {
          affiliate_id?: string | null
          assistant_id?: string | null
          call_metadata?: Json | null
          call_type?: string | null
          caller_phone?: string | null
          cost_llm?: number | null
          cost_platform?: number | null
          cost_stt?: number | null
          cost_total?: number | null
          cost_transport?: number | null
          cost_tts?: number | null
          created_at?: string
          customer_id?: string | null
          demo_id?: string | null
          duration_seconds?: number | null
          ended_reason?: string | null
          id?: string
          recording_url?: string | null
          summary?: string | null
          transcript?: string | null
          vapi_call_id?: string | null
        }
        Update: {
          affiliate_id?: string | null
          assistant_id?: string | null
          call_metadata?: Json | null
          call_type?: string | null
          caller_phone?: string | null
          cost_llm?: number | null
          cost_platform?: number | null
          cost_stt?: number | null
          cost_total?: number | null
          cost_transport?: number | null
          cost_tts?: number | null
          created_at?: string
          customer_id?: string | null
          demo_id?: string | null
          duration_seconds?: number | null
          ended_reason?: string | null
          id?: string
          recording_url?: string | null
          summary?: string | null
          transcript?: string | null
          vapi_call_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vapi_calls_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vapi_calls_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_minutes_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "vapi_calls_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vapi_calls_demo_id_fkey"
            columns: ["demo_id"]
            isOneToOne: false
            referencedRelation: "demos"
            referencedColumns: ["id"]
          },
        ]
      }
      vertical_templates: {
        Row: {
          created_at: string | null
          do_list: Json | null
          dont_list: Json | null
          id: string
          industry: string
          is_active: boolean | null
          name: string
          prompt_template: string
          typical_goals: Json | null
          updated_at: string | null
          vertical_key: string
          vocabulary_preferences: Json | null
        }
        Insert: {
          created_at?: string | null
          do_list?: Json | null
          dont_list?: Json | null
          id?: string
          industry: string
          is_active?: boolean | null
          name: string
          prompt_template: string
          typical_goals?: Json | null
          updated_at?: string | null
          vertical_key: string
          vocabulary_preferences?: Json | null
        }
        Update: {
          created_at?: string | null
          do_list?: Json | null
          dont_list?: Json | null
          id?: string
          industry?: string
          is_active?: boolean | null
          name?: string
          prompt_template?: string
          typical_goals?: Json | null
          updated_at?: string | null
          vertical_key?: string
          vocabulary_preferences?: Json | null
        }
        Relationships: []
      }
      voice_settings: {
        Row: {
          ai_name: string | null
          customer_id: string
          greeting_text: string | null
          id: string
          language_code: string | null
          response_pace: string | null
          updated_at: string
          voice_gender: string | null
          voice_id: string | null
          voice_pitch: number | null
          voice_speed: number | null
          voice_style: string | null
        }
        Insert: {
          ai_name?: string | null
          customer_id: string
          greeting_text?: string | null
          id?: string
          language_code?: string | null
          response_pace?: string | null
          updated_at?: string
          voice_gender?: string | null
          voice_id?: string | null
          voice_pitch?: number | null
          voice_speed?: number | null
          voice_style?: string | null
        }
        Update: {
          ai_name?: string | null
          customer_id?: string
          greeting_text?: string | null
          id?: string
          language_code?: string | null
          response_pace?: string | null
          updated_at?: string
          voice_gender?: string | null
          voice_id?: string | null
          voice_pitch?: number | null
          voice_speed?: number | null
          voice_style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_minutes_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "voice_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      customer_minutes_summary: {
        Row: {
          affiliate_id: string | null
          billing_cycle_end: string | null
          billing_cycle_start: string | null
          customer_id: string | null
          customer_plan_id: string | null
          minutes_included: number | null
          overage_rate: number | null
          plan_name: string | null
          total_minutes_used: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profiles_customer_plan_id_fkey"
            columns: ["customer_plan_id"]
            isOneToOne: false
            referencedRelation: "customer_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_customer_cycle_charges: {
        Args: { p_customer_id: string }
        Returns: {
          base_cost: number
          billing_cycle_end: string
          billing_cycle_start: string
          customer_id: string
          customer_plan_id: string
          minutes_included: number
          monthly_price: number
          overage_cost: number
          overage_minutes: number
          overage_rate: number
          plan_code: string
          plan_name: string
          total_estimated_cost: number
          total_minutes_used: number
        }[]
      }
      distribute_commissions: {
        Args: {
          p_customer_id: string
          p_event_type?: string
          p_gross_amount: number
        }
        Returns: undefined
      }
      generate_payouts_for_period: {
        Args: { p_period_end: string; p_period_start: string }
        Returns: {
          affiliates_paid: number
          total_amount: number
        }[]
      }
      get_affiliate_id_by_username: {
        Args: { p_username: string }
        Returns: string
      }
      get_global_role_for_user: { Args: { p_user_id: string }; Returns: string }
      get_my_global_role: { Args: never; Returns: string }
      get_my_parent_affiliate_id: { Args: never; Returns: string }
      get_own_affiliate_id: { Args: { _user_id: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_super_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      log_minutes_usage_for_customer:
        | {
            Args: {
              p_customer_id: string
              p_minutes: number
              p_occurred_at: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_cost_usd?: number
              p_customer_id: string
              p_minutes: number
              p_occurred_at: string
            }
            Returns: {
              minutes_included: number
              new_minutes_used: number
              percent_used: number
            }[]
          }
      populate_genealogy_for_affiliate: {
        Args: { p_affiliate_id: string }
        Returns: undefined
      }
      test_add_minutes_for_customer: {
        Args: { p_customer_id: string; p_minutes: number }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      test_distribute_commissions: {
        Args: { p_customer_id: string; p_gross_amount: number }
        Returns: {
          message: string
          success: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
