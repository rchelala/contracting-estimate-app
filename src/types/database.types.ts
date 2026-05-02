export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_usage_events: {
        Row: {
          call_type: Database["public"]["Enums"]["ai_call_type"]
          cost_cents: number
          created_at: string
          estimate_id: string | null
          id: string
          input_tokens: number
          latency_ms: number
          model: string
          organization_id: string
          output_tokens: number
          user_id: string
        }
        Insert: {
          call_type: Database["public"]["Enums"]["ai_call_type"]
          cost_cents: number
          created_at?: string
          estimate_id?: string | null
          id?: string
          input_tokens: number
          latency_ms: number
          model: string
          organization_id: string
          output_tokens: number
          user_id: string
        }
        Update: {
          call_type?: Database["public"]["Enums"]["ai_call_type"]
          cost_cents?: number
          created_at?: string
          estimate_id?: string | null
          id?: string
          input_tokens?: number
          latency_ms?: number
          model?: string
          organization_id?: string
          output_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          organization_id: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_attachments: {
        Row: {
          content_type: string
          created_at: string
          estimate_id: string
          filename: string
          id: string
          line_item_id: string | null
          organization_id: string
          section_id: string | null
          show_in_client_view: boolean
          size_bytes: number
          storage_path: string
          thumbnail_path: string | null
        }
        Insert: {
          content_type: string
          created_at?: string
          estimate_id: string
          filename: string
          id?: string
          line_item_id?: string | null
          organization_id: string
          section_id?: string | null
          show_in_client_view?: boolean
          size_bytes: number
          storage_path: string
          thumbnail_path?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          estimate_id?: string
          filename?: string
          id?: string
          line_item_id?: string | null
          organization_id?: string
          section_id?: string | null
          show_in_client_view?: boolean
          size_bytes?: number
          storage_path?: string
          thumbnail_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_attachments_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_attachments_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "estimate_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_attachments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "estimate_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_line_items: {
        Row: {
          ai_price_high_cents: number | null
          ai_price_low_cents: number | null
          ai_price_typical_cents: number | null
          created_at: string
          description: string
          estimate_id: string
          id: string
          markup_pct: number
          optional: boolean
          organization_id: string
          position: number
          quantity: number
          section_id: string
          source: Database["public"]["Enums"]["line_item_source"]
          taxable: boolean
          unit: string | null
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          ai_price_high_cents?: number | null
          ai_price_low_cents?: number | null
          ai_price_typical_cents?: number | null
          created_at?: string
          description: string
          estimate_id: string
          id?: string
          markup_pct?: number
          optional?: boolean
          organization_id: string
          position?: number
          quantity?: number
          section_id: string
          source?: Database["public"]["Enums"]["line_item_source"]
          taxable?: boolean
          unit?: string | null
          unit_price_cents?: number
          updated_at?: string
        }
        Update: {
          ai_price_high_cents?: number | null
          ai_price_low_cents?: number | null
          ai_price_typical_cents?: number | null
          created_at?: string
          description?: string
          estimate_id?: string
          id?: string
          markup_pct?: number
          optional?: boolean
          organization_id?: string
          position?: number
          quantity?: number
          section_id?: string
          source?: Database["public"]["Enums"]["line_item_source"]
          taxable?: boolean
          unit?: string | null
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_line_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_line_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "estimate_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_sections: {
        Row: {
          created_at: string
          estimate_id: string
          id: string
          name: string
          organization_id: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimate_id: string
          id?: string
          name: string
          organization_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimate_id?: string
          id?: string
          name?: string
          organization_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_sections_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_sections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_sequences: {
        Row: {
          last_number: number
          organization_id: string
        }
        Insert: {
          last_number?: number
          organization_id: string
        }
        Update: {
          last_number?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          approved_at: string | null
          approved_by_name: string | null
          approved_client_ip: string | null
          approved_user_agent: string | null
          client_id: string | null
          created_at: string
          estimate_number: string
          expires_at: string | null
          first_sent_at: string | null
          id: string
          issued_at: string | null
          notes: string | null
          organization_id: string
          public_token: string
          sent_at: string | null
          status: Database["public"]["Enums"]["estimate_status"]
          subtotal_cents: number
          tax_cents: number
          tax_rate_pct: number | null
          tax_zip: string | null
          title: string | null
          total_cents: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_name?: string | null
          approved_client_ip?: string | null
          approved_user_agent?: string | null
          client_id?: string | null
          created_at?: string
          estimate_number: string
          expires_at?: string | null
          first_sent_at?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          organization_id: string
          public_token?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["estimate_status"]
          subtotal_cents?: number
          tax_cents?: number
          tax_rate_pct?: number | null
          tax_zip?: string | null
          title?: string | null
          total_cents?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_name?: string | null
          approved_client_ip?: string | null
          approved_user_agent?: string | null
          client_id?: string | null
          created_at?: string
          estimate_number?: string
          expires_at?: string | null
          first_sent_at?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          organization_id?: string
          public_token?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["estimate_status"]
          subtotal_cents?: number
          tax_cents?: number
          tax_rate_pct?: number | null
          tax_zip?: string | null
          title?: string | null
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_sequences: {
        Row: {
          last_number: number
          organization_id: string
        }
        Insert: {
          last_number?: number
          organization_id: string
        }
        Update: {
          last_number?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          created_at: string
          due_at: string | null
          estimate_id: string | null
          id: string
          invoice_number: string
          issued_at: string | null
          notes: string | null
          organization_id: string
          paid_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          due_at?: string | null
          estimate_id?: string | null
          id?: string
          invoice_number: string
          issued_at?: string | null
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          due_at?: string | null
          estimate_id?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          default_tax_zip: string | null
          id: string
          logo_storage_path: string | null
          name: string
          plan: string
          plan_period_start: string | null
          platform_fee_pct: number
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_tax_zip?: string | null
          id?: string
          logo_storage_path?: string | null
          name: string
          plan?: string
          plan_period_start?: string | null
          platform_fee_pct?: number
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_tax_zip?: string | null
          id?: string
          logo_storage_path?: string | null
          name?: string
          plan?: string
          plan_period_start?: string | null
          platform_fee_pct?: number
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          estimate_id: string | null
          id: string
          invoice_id: string | null
          organization_id: string
          request_type: Database["public"]["Enums"]["payment_request_type"]
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          estimate_id?: string | null
          id?: string
          invoice_id?: string | null
          organization_id: string
          request_type: Database["public"]["Enums"]["payment_request_type"]
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          estimate_id?: string | null
          id?: string
          invoice_id?: string | null
          organization_id?: string
          request_type?: Database["public"]["Enums"]["payment_request_type"]
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          id: string
          processed_at: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          combined_rate_pct: number
          state_code: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          combined_rate_pct: number
          state_code: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          combined_rate_pct?: number
          state_code?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_org_member: { Args: { p_org_id: string }; Returns: boolean }
      is_org_owner: { Args: { p_org_id: string }; Returns: boolean }
      next_estimate_number: { Args: { p_org_id: string }; Returns: string }
      next_invoice_number: { Args: { p_org_id: string }; Returns: string }
      recalculate_estimate_totals: {
        Args: { p_estimate_id: string }
        Returns: undefined
      }
    }
    Enums: {
      ai_call_type: "draft_estimate" | "analyze_photo"
      estimate_status:
        | "draft"
        | "sent"
        | "approved"
        | "rejected"
        | "expired"
        | "invoiced"
      invoice_status: "draft" | "sent" | "paid" | "void"
      line_item_source: "ai" | "contractor"
      member_role: "owner" | "member"
      payment_request_type: "deposit" | "full"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_call_type: ["draft_estimate", "analyze_photo"],
      estimate_status: [
        "draft",
        "sent",
        "approved",
        "rejected",
        "expired",
        "invoiced",
      ],
      invoice_status: ["draft", "sent", "paid", "void"],
      line_item_source: ["ai", "contractor"],
      member_role: ["owner", "member"],
      payment_request_type: ["deposit", "full"],
    },
  },
} as const
