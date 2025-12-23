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
      affiliate_avatar_profiles: {
        Row: {
          affiliate_id: string
          created_at: string
          elevenlabs_voice_id: string | null
          error_message: string | null
          heygen_avatar_group_id: string | null
          heygen_avatar_id: string | null
          heygen_voice_id: string | null
          id: string
          photo_urls: string[]
          status: Database["public"]["Enums"]["avatar_profile_status"]
          updated_at: string
          voice_audio_url: string | null
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          elevenlabs_voice_id?: string | null
          error_message?: string | null
          heygen_avatar_group_id?: string | null
          heygen_avatar_id?: string | null
          heygen_voice_id?: string | null
          id?: string
          photo_urls?: string[]
          status?: Database["public"]["Enums"]["avatar_profile_status"]
          updated_at?: string
          voice_audio_url?: string | null
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          elevenlabs_voice_id?: string | null
          error_message?: string | null
          heygen_avatar_group_id?: string | null
          heygen_avatar_id?: string | null
          heygen_voice_id?: string | null
          id?: string
          photo_urls?: string[]
          status?: Database["public"]["Enums"]["avatar_profile_status"]
          updated_at?: string
          voice_audio_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_avatar_profiles_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: true
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
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
      affiliate_videos: {
        Row: {
          affiliate_id: string
          created_at: string
          error_message: string | null
          estimated_cost_usd: number | null
          heygen_video_id: string | null
          heygen_video_url: string | null
          id: string
          is_active: boolean
          landing_page_slug: string | null
          profile_id: string
          script_template_id: string
          status: Database["public"]["Enums"]["video_status"]
          updated_at: string
          video_name: string
          video_type: Database["public"]["Enums"]["video_type"]
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          heygen_video_id?: string | null
          heygen_video_url?: string | null
          id?: string
          is_active?: boolean
          landing_page_slug?: string | null
          profile_id: string
          script_template_id: string
          status?: Database["public"]["Enums"]["video_status"]
          updated_at?: string
          video_name: string
          video_type: Database["public"]["Enums"]["video_type"]
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          heygen_video_id?: string | null
          heygen_video_url?: string | null
          id?: string
          is_active?: boolean
          landing_page_slug?: string | null
          profile_id?: string
          script_template_id?: string
          status?: Database["public"]["Enums"]["video_status"]
          updated_at?: string
          video_name?: string
          video_type?: Database["public"]["Enums"]["video_type"]
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_videos_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_videos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "affiliate_avatar_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_videos_script_template_id_fkey"
            columns: ["script_template_id"]
            isOneToOne: false
            referencedRelation: "video_script_templates"
            referencedColumns: ["id"]
          },
        ]
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
      ai_assistant_actions: {
        Row: {
          action_type: string
          ai_response: string | null
          error_message: string | null
          executed_at: string
          id: string
          parameters: Json | null
          response_time_ms: number | null
          session_id: string
          success: boolean
          user_transcript: string | null
        }
        Insert: {
          action_type: string
          ai_response?: string | null
          error_message?: string | null
          executed_at?: string
          id?: string
          parameters?: Json | null
          response_time_ms?: number | null
          session_id: string
          success?: boolean
          user_transcript?: string | null
        }
        Update: {
          action_type?: string
          ai_response?: string | null
          error_message?: string | null
          executed_at?: string
          id?: string
          parameters?: Json | null
          response_time_ms?: number | null
          session_id?: string
          success?: boolean
          user_transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_assistant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_assistant_sessions: {
        Row: {
          actions_count: number
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          errors_count: number
          id: string
          page_route: string | null
          started_at: string
          user_id: string
          user_role: string | null
          voice_settings: Json | null
        }
        Insert: {
          actions_count?: number
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          errors_count?: number
          id?: string
          page_route?: string | null
          started_at?: string
          user_id: string
          user_role?: string | null
          voice_settings?: Json | null
        }
        Update: {
          actions_count?: number
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          errors_count?: number
          id?: string
          page_route?: string | null
          started_at?: string
          user_id?: string
          user_role?: string | null
          voice_settings?: Json | null
        }
        Relationships: []
      }
      backlog_assignees: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          item_id: string
          user_id: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          item_id: string
          user_id?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          item_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backlog_assignees_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "backlog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_attachments: {
        Row: {
          created_at: string
          deleted_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          item_id: string
          metadata: Json | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          item_id: string
          metadata?: Json | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          item_id?: string
          metadata?: Json | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backlog_attachments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "backlog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_chat_links: {
        Row: {
          chat_platform: string | null
          chat_session_id: string | null
          chat_snapshot: Json | null
          created_at: string
          id: string
          item_id: string
          linked_by: string | null
          summary: string | null
        }
        Insert: {
          chat_platform?: string | null
          chat_session_id?: string | null
          chat_snapshot?: Json | null
          created_at?: string
          id?: string
          item_id: string
          linked_by?: string | null
          summary?: string | null
        }
        Update: {
          chat_platform?: string | null
          chat_session_id?: string | null
          chat_snapshot?: Json | null
          created_at?: string
          id?: string
          item_id?: string
          linked_by?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backlog_chat_links_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "backlog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_comments: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_resolution: boolean | null
          item_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_resolution?: boolean | null
          item_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_resolution?: boolean | null
          item_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlog_comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "backlog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlog_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "backlog_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_history: {
        Row: {
          action: Database["public"]["Enums"]["backlog_action"]
          actor_email: string | null
          actor_id: string | null
          after_values: Json | null
          before_values: Json | null
          changed_fields: Json | null
          created_at: string
          id: string
          item_id: string
          reason: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["backlog_action"]
          actor_email?: string | null
          actor_id?: string | null
          after_values?: Json | null
          before_values?: Json | null
          changed_fields?: Json | null
          created_at?: string
          id?: string
          item_id: string
          reason?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["backlog_action"]
          actor_email?: string | null
          actor_id?: string | null
          after_values?: Json | null
          before_values?: Json | null
          changed_fields?: Json | null
          created_at?: string
          id?: string
          item_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backlog_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "backlog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_item_tags: {
        Row: {
          created_at: string
          id: string
          item_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlog_item_tags_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "backlog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlog_item_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "backlog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_items: {
        Row: {
          abandoned_at: string | null
          abandoned_reason: string | null
          actual_hours: number | null
          conversation_context: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          estimated_hours: number | null
          id: string
          is_abandoned: boolean | null
          metadata: Json | null
          position: number
          priority: Database["public"]["Enums"]["backlog_priority"]
          research_notes: string | null
          search_vector: unknown
          status_id: string
          story_points: number | null
          title: string
          updated_at: string
        }
        Insert: {
          abandoned_at?: string | null
          abandoned_reason?: string | null
          actual_hours?: number | null
          conversation_context?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_abandoned?: boolean | null
          metadata?: Json | null
          position?: number
          priority?: Database["public"]["Enums"]["backlog_priority"]
          research_notes?: string | null
          search_vector?: unknown
          status_id: string
          story_points?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          abandoned_at?: string | null
          abandoned_reason?: string | null
          actual_hours?: number | null
          conversation_context?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_abandoned?: boolean | null
          metadata?: Json | null
          position?: number
          priority?: Database["public"]["Enums"]["backlog_priority"]
          research_notes?: string | null
          search_vector?: unknown
          status_id?: string
          story_points?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlog_items_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "backlog_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_statuses: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_archived_state: boolean | null
          is_default: boolean | null
          is_done_state: boolean | null
          name: string
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived_state?: boolean | null
          is_default?: boolean | null
          is_done_state?: boolean | null
          name: string
          position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived_state?: boolean | null
          is_default?: boolean | null
          is_done_state?: boolean | null
          name?: string
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      backlog_tags: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
      brain_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          search_vector: unknown
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          search_vector?: unknown
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          search_vector?: unknown
          updated_at?: string
        }
        Relationships: []
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
          webhook_url: string | null
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
          webhook_url?: string | null
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
          webhook_url?: string | null
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
          action_summary: Json | null
          analysis_cost: number | null
          analyzed_at: string
          analyzer_model: string | null
          call_category: string | null
          call_id: string | null
          channel: string | null
          config_version: string | null
          created_at: string
          customer_id: string | null
          id: string
          insights: Json | null
          issue_tags: string[] | null
          mapped_layer: string | null
          overall_score: number | null
          recommended_fix: Json | null
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
          vertical_id: string | null
        }
        Insert: {
          action_summary?: Json | null
          analysis_cost?: number | null
          analyzed_at?: string
          analyzer_model?: string | null
          call_category?: string | null
          call_id?: string | null
          channel?: string | null
          config_version?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          insights?: Json | null
          issue_tags?: string[] | null
          mapped_layer?: string | null
          overall_score?: number | null
          recommended_fix?: Json | null
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
          vertical_id?: string | null
        }
        Update: {
          action_summary?: Json | null
          analysis_cost?: number | null
          analyzed_at?: string
          analyzer_model?: string | null
          call_category?: string | null
          call_id?: string | null
          channel?: string | null
          config_version?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          insights?: Json | null
          issue_tags?: string[] | null
          mapped_layer?: string | null
          overall_score?: number | null
          recommended_fix?: Json | null
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
          vertical_id?: string | null
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
          ai_outcome: string | null
          ai_outcome_confidence: number | null
          ai_outcome_reason: string | null
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
          ai_outcome?: string | null
          ai_outcome_confidence?: number | null
          ai_outcome_reason?: string | null
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
          ai_outcome?: string | null
          ai_outcome_confidence?: number | null
          ai_outcome_reason?: string | null
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
          content_text: string | null
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
          content_text?: string | null
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
          content_text?: string | null
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
          settings_updated_at: string
          sms_notifications_enabled: boolean | null
          testing_code: string | null
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
          settings_updated_at?: string
          sms_notifications_enabled?: boolean | null
          testing_code?: string | null
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
          settings_updated_at?: string
          sms_notifications_enabled?: boolean | null
          testing_code?: string | null
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
      demo_views: {
        Row: {
          created_at: string
          demo_id: string
          id: string
          lead_id: string | null
          progress_percent: number | null
          updated_at: string
          watch_duration_seconds: number | null
        }
        Insert: {
          created_at?: string
          demo_id: string
          id?: string
          lead_id?: string | null
          progress_percent?: number | null
          updated_at?: string
          watch_duration_seconds?: number | null
        }
        Update: {
          created_at?: string
          demo_id?: string
          id?: string
          lead_id?: string | null
          progress_percent?: number | null
          updated_at?: string
          watch_duration_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_views_demo_id_fkey"
            columns: ["demo_id"]
            isOneToOne: false
            referencedRelation: "demos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_views_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      email_events: {
        Row: {
          created_at: string
          email_id: string | null
          event_type: string
          id: string
          ip_address: string | null
          lead_id: string | null
          url: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email_id?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          url?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email_id?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_lead_id_fkey"
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
          lead_id: string | null
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
          lead_id?: string | null
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
          lead_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "emails_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
      expenses_monthly: {
        Row: {
          actual_amount: number | null
          budgeted_amount: number | null
          created_at: string
          id: string
          invoice_url: string | null
          is_overdue: boolean | null
          month: string
          notes: Json | null
          paid_at: string | null
          service_id: string
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          budgeted_amount?: number | null
          created_at?: string
          id?: string
          invoice_url?: string | null
          is_overdue?: boolean | null
          month: string
          notes?: Json | null
          paid_at?: string | null
          service_id: string
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          budgeted_amount?: number | null
          created_at?: string
          id?: string
          invoice_url?: string | null
          is_overdue?: boolean | null
          month?: string
          notes?: Json | null
          paid_at?: string | null
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_monthly_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "expenses_services"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses_services: {
        Row: {
          attribution_split: Json | null
          base_cost: number
          billing_portal_url: string | null
          cancellation_impact: string | null
          category: string
          cost_attribution: string
          created_at: string
          current_plan: string | null
          id: string
          last_reviewed_at: string | null
          notes: string | null
          pricing_model: string
          primary_purpose: string | null
          service_name: string
          status: string
          updated_at: string
        }
        Insert: {
          attribution_split?: Json | null
          base_cost?: number
          billing_portal_url?: string | null
          cancellation_impact?: string | null
          category: string
          cost_attribution: string
          created_at?: string
          current_plan?: string | null
          id?: string
          last_reviewed_at?: string | null
          notes?: string | null
          pricing_model: string
          primary_purpose?: string | null
          service_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          attribution_split?: Json | null
          base_cost?: number
          billing_portal_url?: string | null
          cancellation_impact?: string | null
          category?: string
          cost_attribution?: string
          created_at?: string
          current_plan?: string | null
          id?: string
          last_reviewed_at?: string | null
          notes?: string | null
          pricing_model?: string
          primary_purpose?: string | null
          service_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      follow_up_feedback: {
        Row: {
          created_at: string
          feedback: string
          id: string
          lead_id: string
          suggestion_key: string
          suggestion_text: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feedback: string
          id?: string
          lead_id: string
          suggestion_key: string
          suggestion_text: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feedback?: string
          id?: string
          lead_id?: string
          suggestion_key?: string
          suggestion_text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_feedback_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_resolutions: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          resolved_at: string
          resolved_by: string | null
          suggestion_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          resolved_at?: string
          resolved_by?: string | null
          suggestion_key: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          resolved_at?: string
          resolved_by?: string | null
          suggestion_key?: string
        }
        Relationships: []
      }
      followup_learning_log: {
        Row: {
          accepted: boolean
          confidence_score: number | null
          confirmed: boolean
          demo_id: string | null
          id: string
          lead_id: string | null
          recorded_at: string
          suggestion_text: string
          suggestion_type: string
          user_id: string
        }
        Insert: {
          accepted?: boolean
          confidence_score?: number | null
          confirmed?: boolean
          demo_id?: string | null
          id?: string
          lead_id?: string | null
          recorded_at?: string
          suggestion_text: string
          suggestion_type: string
          user_id: string
        }
        Update: {
          accepted?: boolean
          confidence_score?: number | null
          confirmed?: boolean
          demo_id?: string | null
          id?: string
          lead_id?: string | null
          recorded_at?: string
          suggestion_text?: string
          suggestion_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_learning_log_demo_id_fkey"
            columns: ["demo_id"]
            isOneToOne: false
            referencedRelation: "demos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_learning_log_lead_id_fkey"
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
      golden_scenarios: {
        Row: {
          channel: string
          config_overrides: Json | null
          conversation_script: Json
          created_at: string | null
          expected_assertions: Json
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          vertical_id: number | null
        }
        Insert: {
          channel: string
          config_overrides?: Json | null
          conversation_script?: Json
          created_at?: string | null
          expected_assertions?: Json
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          vertical_id?: number | null
        }
        Update: {
          channel?: string
          config_overrides?: Json | null
          conversation_script?: Json
          created_at?: string | null
          expected_assertions?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          vertical_id?: number | null
        }
        Relationships: []
      }
      heygen_cache: {
        Row: {
          cached_at: string
          key: string
          payload: Json
        }
        Insert: {
          cached_at?: string
          key: string
          payload: Json
        }
        Update: {
          cached_at?: string
          key?: string
          payload?: Json
        }
        Relationships: []
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
      lead_intents: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          source: string
          tag: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          source?: string
          tag: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          source?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_intents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_presence: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          lead_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          lead_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_presence_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sequences: {
        Row: {
          added_by: string | null
          created_at: string
          current_step: number
          id: string
          lead_id: string
          scheduled_start_at: string
          sequence_id: string
          status: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          current_step?: number
          id?: string
          lead_id: string
          scheduled_start_at: string
          sequence_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          current_step?: number
          id?: string
          lead_id?: string
          scheduled_start_at?: string
          sequence_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_sequences_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_sequences_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_ai_generated: boolean
          lead_id: string
          tag_text: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_ai_generated?: boolean
          lead_id: string
          tag_text: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_ai_generated?: boolean
          lead_id?: string
          tag_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_team_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          lead_id: string
          note_text: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          lead_id: string
          note_text: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          lead_id?: string
          note_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_team_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_timeline_highlights: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          lead_id: string
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          lead_id: string
          summary: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          lead_id?: string
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_timeline_summaries: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          lead_id: string
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          lead_id: string
          summary: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          lead_id?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_timeline_summaries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_views: {
        Row: {
          id: string
          lead_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          lead_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          lead_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_views_lead_id_fkey"
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
          assigned_to_user_id: string | null
          city: string | null
          company: string | null
          created_at: string
          done_for_you: boolean
          email: string | null
          facebook_url: string | null
          first_name: string
          google_business_status: string | null
          google_enriched_at: string | null
          google_formatted_address: string | null
          google_formatted_phone: string | null
          google_opening_hours: Json | null
          google_photos_count: number | null
          google_place_id: string | null
          google_price_level: number | null
          google_rating: number | null
          google_review_count: number | null
          google_types: string[] | null
          google_user_ratings_total: number | null
          has_website: boolean | null
          id: string
          import_batch_id: string | null
          industry: string | null
          instagram_handle: string | null
          last_name: string
          notes: string | null
          phone: string | null
          pipeline_status: string
          priority: boolean
          quiet_mode: boolean
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
          assigned_to_user_id?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          done_for_you?: boolean
          email?: string | null
          facebook_url?: string | null
          first_name: string
          google_business_status?: string | null
          google_enriched_at?: string | null
          google_formatted_address?: string | null
          google_formatted_phone?: string | null
          google_opening_hours?: Json | null
          google_photos_count?: number | null
          google_place_id?: string | null
          google_price_level?: number | null
          google_rating?: number | null
          google_review_count?: number | null
          google_types?: string[] | null
          google_user_ratings_total?: number | null
          has_website?: boolean | null
          id?: string
          import_batch_id?: string | null
          industry?: string | null
          instagram_handle?: string | null
          last_name: string
          notes?: string | null
          phone?: string | null
          pipeline_status?: string
          priority?: boolean
          quiet_mode?: boolean
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
          assigned_to_user_id?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          done_for_you?: boolean
          email?: string | null
          facebook_url?: string | null
          first_name?: string
          google_business_status?: string | null
          google_enriched_at?: string | null
          google_formatted_address?: string | null
          google_formatted_phone?: string | null
          google_opening_hours?: Json | null
          google_photos_count?: number | null
          google_place_id?: string | null
          google_price_level?: number | null
          google_rating?: number | null
          google_review_count?: number | null
          google_types?: string[] | null
          google_user_ratings_total?: number | null
          has_website?: boolean | null
          id?: string
          import_batch_id?: string | null
          industry?: string | null
          instagram_handle?: string | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          pipeline_status?: string
          priority?: boolean
          quiet_mode?: boolean
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
      manual_follow_ups: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          notes: string | null
          resolved_at: string | null
          source: string
          status: string
          summary: string
          triggered_at: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          resolved_at?: string | null
          source?: string
          status?: string
          summary: string
          triggered_at?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          resolved_at?: string | null
          source?: string
          status?: string
          summary?: string
          triggered_at?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      prompt_templates: {
        Row: {
          category: string
          channel: string
          created_at: string
          deployed_at: string | null
          id: string
          is_active: boolean
          name: string
          parent_version_id: string | null
          prompt_content: string
          research_notes: string | null
          search_vector: unknown
          sync_status: string
          updated_at: string
          use_case: string
          variables: Json | null
          version: number
        }
        Insert: {
          category?: string
          channel?: string
          created_at?: string
          deployed_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_version_id?: string | null
          prompt_content: string
          research_notes?: string | null
          search_vector?: unknown
          sync_status?: string
          updated_at?: string
          use_case?: string
          variables?: Json | null
          version?: number
        }
        Update: {
          category?: string
          channel?: string
          created_at?: string
          deployed_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_version_id?: string | null
          prompt_content?: string
          research_notes?: string | null
          search_vector?: unknown
          sync_status?: string
          updated_at?: string
          use_case?: string
          variables?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_alerts: {
        Row: {
          actual_value: number | null
          alert_type: string
          call_analysis_id: string | null
          channel: string | null
          created_at: string
          customer_id: string | null
          id: string
          message: string
          metadata: Json | null
          resolved_at: string | null
          severity: string
          threshold_value: number | null
          vertical_id: string | null
        }
        Insert: {
          actual_value?: number | null
          alert_type?: string
          call_analysis_id?: string | null
          channel?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          threshold_value?: number | null
          vertical_id?: string | null
        }
        Update: {
          actual_value?: number | null
          alert_type?: string
          call_analysis_id?: string | null
          channel?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          threshold_value?: number | null
          vertical_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_alerts_call_analysis_id_fkey"
            columns: ["call_analysis_id"]
            isOneToOne: false
            referencedRelation: "call_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_minutes_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quality_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      regression_test_results: {
        Row: {
          ai_response: string | null
          assertions_failed: Json | null
          assertions_passed: Json | null
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          generated_prompt: string | null
          id: string
          passed: boolean
          run_id: string
          scenario_id: string
        }
        Insert: {
          ai_response?: string | null
          assertions_failed?: Json | null
          assertions_passed?: Json | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          generated_prompt?: string | null
          id?: string
          passed: boolean
          run_id: string
          scenario_id: string
        }
        Update: {
          ai_response?: string | null
          assertions_failed?: Json | null
          assertions_passed?: Json | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          generated_prompt?: string | null
          id?: string
          passed?: boolean
          run_id?: string
          scenario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regression_test_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "regression_test_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regression_test_results_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "golden_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      regression_test_runs: {
        Row: {
          completed_at: string | null
          failed_count: number
          id: string
          passed_count: number
          run_type: string
          started_at: string | null
          status: string
          total_scenarios: number
          triggered_by: string | null
          vertical_filter: number | null
        }
        Insert: {
          completed_at?: string | null
          failed_count?: number
          id?: string
          passed_count?: number
          run_type?: string
          started_at?: string | null
          status?: string
          total_scenarios?: number
          triggered_by?: string | null
          vertical_filter?: number | null
        }
        Update: {
          completed_at?: string | null
          failed_count?: number
          id?: string
          passed_count?: number
          run_type?: string
          started_at?: string | null
          status?: string
          total_scenarios?: number
          triggered_by?: string | null
          vertical_filter?: number | null
        }
        Relationships: []
      }
      remediation_suggestions: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          channel: string | null
          created_at: string
          id: string
          issue_tags: string[]
          notes: string | null
          occurrence_count: number
          patch_payload: Json | null
          patch_target: string | null
          patch_text: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_analyses: string[] | null
          status: string
          suggested_changes: Json
          updated_at: string
          vertical_id: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          issue_tags?: string[]
          notes?: string | null
          occurrence_count?: number
          patch_payload?: Json | null
          patch_target?: string | null
          patch_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_analyses?: string[] | null
          status?: string
          suggested_changes: Json
          updated_at?: string
          vertical_id: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          issue_tags?: string[]
          notes?: string | null
          occurrence_count?: number
          patch_payload?: Json | null
          patch_target?: string | null
          patch_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_analyses?: string[] | null
          status?: string
          suggested_changes?: Json
          updated_at?: string
          vertical_id?: string
        }
        Relationships: []
      }
      scheduled_follow_ups: {
        Row: {
          action_type: string
          auto_approved: boolean
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          message_body: string | null
          message_subject: string | null
          scheduled_for: string
          sent_at: string | null
          suggestion_id: string
        }
        Insert: {
          action_type: string
          auto_approved?: boolean
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          message_body?: string | null
          message_subject?: string | null
          scheduled_for: string
          sent_at?: string | null
          suggestion_id: string
        }
        Update: {
          action_type?: string
          auto_approved?: boolean
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          message_body?: string | null
          message_subject?: string | null
          scheduled_for?: string
          sent_at?: string | null
          suggestion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
      sequences: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          steps_count: number
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          steps_count?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          steps_count?: number
          updated_at?: string
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
      suggestion_log: {
        Row: {
          category: string | null
          context: string | null
          created_at: string
          id: string
          suggestion_text: string
        }
        Insert: {
          category?: string | null
          context?: string | null
          created_at?: string
          id?: string
          suggestion_text: string
        }
        Update: {
          category?: string | null
          context?: string | null
          created_at?: string
          id?: string
          suggestion_text?: string
        }
        Relationships: []
      }
      summary_deliveries: {
        Row: {
          created_at: string
          delivered_at: string
          delivery_method: string
          error_message: string | null
          id: string
          status: string
          summary_content: string | null
          summary_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string
          delivery_method: string
          error_message?: string | null
          id?: string
          status?: string
          summary_content?: string | null
          summary_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string
          delivery_method?: string
          error_message?: string | null
          id?: string
          status?: string
          summary_content?: string | null
          summary_type?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
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
      test_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step_index: number
          id: string
          notes: string | null
          started_at: string
          status: string
          suite_id: string
          tester_user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step_index?: number
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          suite_id: string
          tester_user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step_index?: number
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          suite_id?: string
          tester_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_runs_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      test_step_completions: {
        Row: {
          completed_at: string
          id: string
          notes: string | null
          result: string
          run_id: string
          screenshot_url: string | null
          step_id: string
          step_index: number
        }
        Insert: {
          completed_at?: string
          id?: string
          notes?: string | null
          result: string
          run_id: string
          screenshot_url?: string | null
          step_id: string
          step_index: number
        }
        Update: {
          completed_at?: string
          id?: string
          notes?: string | null
          result?: string
          run_id?: string
          screenshot_url?: string | null
          step_id?: string
          step_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_step_completions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_suites: {
        Row: {
          category: string
          created_at: string
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          is_active: boolean
          name: string
          position: number
          prerequisites: string[] | null
          steps: Json
          test_credentials: Json | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name: string
          position?: number
          prerequisites?: string[] | null
          steps?: Json
          test_credentials?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          prerequisites?: string[] | null
          steps?: Json
          test_credentials?: Json | null
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
      training_library: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          latest_video_path: string | null
          pain_points: Json
          script: string
          script_version: number
          slug: string
          title: string
          training_type: Database["public"]["Enums"]["training_type"]
          updated_at: string
          vertical_key: string | null
          where_to_find: Json
          why_phone_ai_fits: Json
          why_priority: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          latest_video_path?: string | null
          pain_points?: Json
          script: string
          script_version?: number
          slug: string
          title: string
          training_type?: Database["public"]["Enums"]["training_type"]
          updated_at?: string
          vertical_key?: string | null
          where_to_find?: Json
          why_phone_ai_fits?: Json
          why_priority?: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          latest_video_path?: string | null
          pain_points?: Json
          script?: string
          script_version?: number
          slug?: string
          title?: string
          training_type?: Database["public"]["Enums"]["training_type"]
          updated_at?: string
          vertical_key?: string | null
          where_to_find?: Json
          why_phone_ai_fits?: Json
          why_priority?: Json
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
      training_videos: {
        Row: {
          avatar_id: string
          avatar_name: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          estimated_cost_usd: number | null
          heygen_video_id: string | null
          id: string
          linked_vertical_id: string | null
          script_text: string
          status: string
          title: string
          training_library_id: string | null
          updated_at: string
          vertical: string | null
          video_url: string | null
          voice_id: string
          voice_name: string | null
        }
        Insert: {
          avatar_id: string
          avatar_name?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          heygen_video_id?: string | null
          id?: string
          linked_vertical_id?: string | null
          script_text: string
          status?: string
          title: string
          training_library_id?: string | null
          updated_at?: string
          vertical?: string | null
          video_url?: string | null
          voice_id: string
          voice_name?: string | null
        }
        Update: {
          avatar_id?: string
          avatar_name?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          heygen_video_id?: string | null
          id?: string
          linked_vertical_id?: string | null
          script_text?: string
          status?: string
          title?: string
          training_library_id?: string | null
          updated_at?: string
          vertical?: string | null
          video_url?: string | null
          voice_id?: string
          voice_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_videos_linked_vertical_id_fkey"
            columns: ["linked_vertical_id"]
            isOneToOne: false
            referencedRelation: "vertical_training"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_videos_training_library_id_fkey"
            columns: ["training_library_id"]
            isOneToOne: false
            referencedRelation: "training_library"
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
      user_preferences: {
        Row: {
          ai_assistant_voice: string | null
          ai_auto_play_responses: boolean | null
          ai_speech_speed: number | null
          ai_voice_sensitivity: string | null
          created_at: string
          enable_voice_summary: boolean
          id: string
          include_followup_reminders: boolean
          summary_delivery_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_assistant_voice?: string | null
          ai_auto_play_responses?: boolean | null
          ai_speech_speed?: number | null
          ai_voice_sensitivity?: string | null
          created_at?: string
          enable_voice_summary?: boolean
          id?: string
          include_followup_reminders?: boolean
          summary_delivery_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_assistant_voice?: string | null
          ai_auto_play_responses?: boolean | null
          ai_speech_speed?: number | null
          ai_voice_sensitivity?: string | null
          created_at?: string
          enable_voice_summary?: boolean
          id?: string
          include_followup_reminders?: boolean
          summary_delivery_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          via_testing_line: boolean | null
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
          via_testing_line?: boolean | null
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
          via_testing_line?: boolean | null
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
      vertical_training: {
        Row: {
          id: string
          industry_name: string
          pain_points: Json
          parent_archetype: string | null
          rank: number
          updated_at: string
          video_path: string | null
          where_to_find: Json
          why_phone_ai_fits: Json
          why_priority: Json
        }
        Insert: {
          id?: string
          industry_name: string
          pain_points?: Json
          parent_archetype?: string | null
          rank: number
          updated_at?: string
          video_path?: string | null
          where_to_find?: Json
          why_phone_ai_fits?: Json
          why_priority?: Json
        }
        Update: {
          id?: string
          industry_name?: string
          pain_points?: Json
          parent_archetype?: string | null
          rank?: number
          updated_at?: string
          video_path?: string | null
          where_to_find?: Json
          why_phone_ai_fits?: Json
          why_priority?: Json
        }
        Relationships: []
      }
      video_analytics: {
        Row: {
          affiliate_id: string
          event_timestamp: string
          event_type: Database["public"]["Enums"]["video_event_type"]
          id: string
          ip_address: string | null
          referrer: string | null
          user_agent: string | null
          video_id: string
        }
        Insert: {
          affiliate_id: string
          event_timestamp?: string
          event_type: Database["public"]["Enums"]["video_event_type"]
          id?: string
          ip_address?: string | null
          referrer?: string | null
          user_agent?: string | null
          video_id: string
        }
        Update: {
          affiliate_id?: string
          event_timestamp?: string
          event_type?: Database["public"]["Enums"]["video_event_type"]
          id?: string
          ip_address?: string | null
          referrer?: string | null
          user_agent?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_analytics_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_analytics_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "affiliate_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_cost_log: {
        Row: {
          affiliate_id: string | null
          created_at: string
          estimated_cost_usd: number | null
          estimated_credits: number | null
          id: string
          metadata: Json | null
          operation_type: string
          provider: string
        }
        Insert: {
          affiliate_id?: string | null
          created_at?: string
          estimated_cost_usd?: number | null
          estimated_credits?: number | null
          id?: string
          metadata?: Json | null
          operation_type: string
          provider: string
        }
        Update: {
          affiliate_id?: string | null
          created_at?: string
          estimated_cost_usd?: number | null
          estimated_credits?: number | null
          id?: string
          metadata?: Json | null
          operation_type?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_cost_log_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      video_script_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          script_text: string
          sort_order: number
          video_type: Database["public"]["Enums"]["video_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          script_text: string
          sort_order?: number
          video_type: Database["public"]["Enums"]["video_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          script_text?: string
          sort_order?: number
          video_type?: Database["public"]["Enums"]["video_type"]
        }
        Relationships: []
      }
      video_system_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
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
      workspace_documents: {
        Row: {
          created_at: string
          description: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          name: string
          search_vector: unknown
          storage_path: string
          tags: string[] | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          search_vector?: unknown
          storage_path: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          search_vector?: unknown
          storage_path?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
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
      lead_timeline: {
        Row: {
          event_at: string | null
          event_type: string | null
          id: string | null
          lead_id: string | null
          metadata: Json | null
          preview_content: string | null
          summary: string | null
        }
        Relationships: []
      }
      quality_patterns_weekly: {
        Row: {
          avg_accuracy: number | null
          avg_booking_success: number | null
          avg_clarity: number | null
          avg_completeness: number | null
          avg_lead_quality: number | null
          avg_objection_handling: number | null
          avg_score: number | null
          avg_tone: number | null
          call_count: number | null
          channel: string | null
          low_score_count: number | null
          negative_sentiment_count: number | null
          prev_week_score: number | null
          score_trend: number | null
          vertical_id: string | null
          week_start: string | null
        }
        Relationships: []
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
      get_crm_team_members: {
        Args: never
        Returns: {
          email: string
          global_role: string
          user_id: string
        }[]
      }
      get_global_role_for_user: { Args: { p_user_id: string }; Returns: string }
      get_my_global_role: { Args: never; Returns: string }
      get_my_parent_affiliate_id: { Args: never; Returns: string }
      get_own_affiliate_id: { Args: { _user_id: string }; Returns: string }
      get_pipeline_status_order: { Args: { p_status: string }; Returns: number }
      get_struggling_verticals: {
        Args: { p_days?: number; p_limit?: number; p_min_calls?: number }
        Returns: {
          avg_score: number
          call_count: number
          channel: string
          low_score_count: number
          top_issues: string[]
          vertical_id: string
        }[]
      }
      get_top_issue_tags: {
        Args: {
          p_channel?: string
          p_days?: number
          p_limit?: number
          p_vertical_id?: string
        }
        Returns: {
          affected_verticals: string[]
          avg_score_impact: number
          issue_tag: string
          occurrence_count: number
        }[]
      }
      increment_demo_voice_count: {
        Args: { demo_id: string }
        Returns: undefined
      }
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
      search_operations: {
        Args: { p_query: string; p_scope?: string }
        Returns: {
          created_at: string
          rank: number
          result_id: string
          result_type: string
          snippet: string
          title: string
        }[]
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
      avatar_profile_status:
        | "draft"
        | "uploading"
        | "training"
        | "ready"
        | "failed"
      backlog_action:
        | "create"
        | "update"
        | "delete"
        | "comment"
        | "attach"
        | "move"
        | "assign"
        | "tag"
        | "link_chat"
        | "archive"
        | "restore"
      backlog_priority: "low" | "medium" | "high" | "critical"
      training_type:
        | "core"
        | "advanced"
        | "bridge_play"
        | "product"
        | "process"
        | "objection"
        | "generic"
      video_event_type: "view" | "phone_cta" | "chat_cta" | "voice_cta"
      video_status: "draft" | "generating" | "ready" | "failed"
      video_type:
        | "recruitment"
        | "product"
        | "attorney"
        | "dentist"
        | "salon"
        | "plumber"
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
    Enums: {
      avatar_profile_status: [
        "draft",
        "uploading",
        "training",
        "ready",
        "failed",
      ],
      backlog_action: [
        "create",
        "update",
        "delete",
        "comment",
        "attach",
        "move",
        "assign",
        "tag",
        "link_chat",
        "archive",
        "restore",
      ],
      backlog_priority: ["low", "medium", "high", "critical"],
      training_type: [
        "core",
        "advanced",
        "bridge_play",
        "product",
        "process",
        "objection",
        "generic",
      ],
      video_event_type: ["view", "phone_cta", "chat_cta", "voice_cta"],
      video_status: ["draft", "generating", "ready", "failed"],
      video_type: [
        "recruitment",
        "product",
        "attorney",
        "dentist",
        "salon",
        "plumber",
      ],
    },
  },
} as const
