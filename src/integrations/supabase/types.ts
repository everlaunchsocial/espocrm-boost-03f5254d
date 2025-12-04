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
      contacts: {
        Row: {
          account_id: string | null
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
      invoice_items: {
        Row: {
          created_at: string
          description: string
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
          service_category?: string | null
          source?: string
          state?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
