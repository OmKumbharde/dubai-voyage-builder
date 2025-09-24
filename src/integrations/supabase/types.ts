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
      hotel_rates: {
        Row: {
          created_at: string
          date: string
          hotel_id: string | null
          id: string
          inventory: number | null
          rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          hotel_id?: string | null
          id?: string
          inventory?: number | null
          rate?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          hotel_id?: string | null
          id?: string
          inventory?: number | null
          rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_rates_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          amenities: string[] | null
          base_rate: number | null
          created_at: string
          description: string | null
          extra_bed_rate: number | null
          id: string
          images: string[] | null
          location: string
          name: string
          star_rating: number | null
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          base_rate?: number | null
          created_at?: string
          description?: string | null
          extra_bed_rate?: number | null
          id?: string
          images?: string[] | null
          location: string
          name: string
          star_rating?: number | null
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          base_rate?: number | null
          created_at?: string
          description?: string | null
          extra_bed_rate?: number | null
          id?: string
          images?: string[] | null
          location?: string
          name?: string
          star_rating?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      inclusions: {
        Row: {
          cost: number
          created_at: string
          description: string | null
          id: string
          is_optional: boolean | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          is_optional?: boolean | null
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          is_optional?: boolean | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          payment_terms: string | null
          quote_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          invoice_number: string
          issue_date?: string
          payment_terms?: string | null
          quote_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          payment_terms?: string | null
          quote_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          adults: number
          client_email: string | null
          client_name: string
          cnb: number | null
          created_at: string
          currency: string | null
          cwb: number | null
          formatted_quote: string | null
          id: string
          infants: number | null
          notes: string | null
          reference_number: string
          status: string | null
          total_amount: number
          travel_dates_from: string
          travel_dates_to: string
          updated_at: string
        }
        Insert: {
          adults?: number
          client_email?: string | null
          client_name: string
          cnb?: number | null
          created_at?: string
          currency?: string | null
          cwb?: number | null
          formatted_quote?: string | null
          id?: string
          infants?: number | null
          notes?: string | null
          reference_number: string
          status?: string | null
          total_amount: number
          travel_dates_from: string
          travel_dates_to: string
          updated_at?: string
        }
        Update: {
          adults?: number
          client_email?: string | null
          client_name?: string
          cnb?: number | null
          created_at?: string
          currency?: string | null
          cwb?: number | null
          formatted_quote?: string | null
          id?: string
          infants?: number | null
          notes?: string | null
          reference_number?: string
          status?: string | null
          total_amount?: number
          travel_dates_from?: string
          travel_dates_to?: string
          updated_at?: string
        }
        Relationships: []
      }
      tours: {
        Row: {
          cost_per_person: number
          created_at: string
          description: string | null
          duration: string | null
          highlights: string[] | null
          id: string
          images: string[] | null
          name: string
          private_transfer_cost: number | null
          transfer_included: boolean | null
          type: string
          updated_at: string
        }
        Insert: {
          cost_per_person: number
          created_at?: string
          description?: string | null
          duration?: string | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          name: string
          private_transfer_cost?: number | null
          transfer_included?: boolean | null
          type?: string
          updated_at?: string
        }
        Update: {
          cost_per_person?: number
          created_at?: string
          description?: string | null
          duration?: string | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          name?: string
          private_transfer_cost?: number | null
          transfer_included?: boolean | null
          type?: string
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
