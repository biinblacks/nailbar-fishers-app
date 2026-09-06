// Generated from the Supabase schema. Do not edit by hand.
// Regenerate: see scripts/gen-types.md
/* eslint-disable */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      ai_knowledge: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          salon_id: string
          topic: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          salon_id: string
          topic: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          salon_id?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          conversation_id: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          duration_minutes: number | null
          id: string
          notes: string | null
          review_requested: boolean
          salon_id: string
          service_id: string | null
          source: string
          staff_id: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          review_requested?: boolean
          salon_id: string
          service_id?: string | null
          source?: string
          staff_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          review_requested?: boolean
          salon_id?: string
          service_id?: string | null
          source?: string
          staff_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          close_time: string | null
          day_of_week: number
          id: string
          is_closed: boolean
          open_time: string | null
          salon_id: string
          updated_at: string
        }
        Insert: {
          close_time?: string | null
          day_of_week: number
          id?: string
          is_closed?: boolean
          open_time?: string | null
          salon_id: string
          updated_at?: string
        }
        Update: {
          close_time?: string | null
          day_of_week?: number
          id?: string
          is_closed?: boolean
          open_time?: string | null
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          channel: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          language: string
          last_message_at: string
          message_count: number
          needs_human: boolean
          resolved_at: string | null
          salon_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          language?: string
          last_message_at?: string
          message_count?: number
          needs_human?: boolean
          resolved_at?: string | null
          salon_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          language?: string
          last_message_at?: string
          message_count?: number
          needs_human?: boolean
          resolved_at?: string | null
          salon_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["chat_role"]
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["chat_role"]
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["chat_role"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birthday: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_visit_at: string | null
          marketing_opt_in: boolean
          notes: string | null
          phone: string
          preferred_language: string | null
          salon_id: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_visit_at?: string | null
          marketing_opt_in?: boolean
          notes?: string | null
          phone: string
          preferred_language?: string | null
          salon_id: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_visit_at?: string | null
          marketing_opt_in?: boolean
          notes?: string | null
          phone?: string
          preferred_language?: string | null
          salon_id?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          question: string
          salon_id: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question: string
          salon_id: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question?: string
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faqs_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      interpreter_sessions: {
        Row: {
          created_at: string
          customer_id: string | null
          ended_at: string | null
          id: string
          lang_a: string
          lang_b: string
          salon_id: string
          started_at: string
          started_by: string | null
          title: string | null
          turn_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          ended_at?: string | null
          id?: string
          lang_a?: string
          lang_b?: string
          salon_id: string
          started_at?: string
          started_by?: string | null
          title?: string | null
          turn_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          ended_at?: string | null
          id?: string
          lang_a?: string
          lang_b?: string
          salon_id?: string
          started_at?: string
          started_by?: string | null
          title?: string | null
          turn_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interpreter_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interpreter_sessions_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      interpreter_turns: {
        Row: {
          created_at: string
          id: string
          salon_id: string
          session_id: string
          source_lang: string
          source_text: string
          speaker: string
          target_lang: string
          translated_text: string
          via: string
        }
        Insert: {
          created_at?: string
          id?: string
          salon_id: string
          session_id: string
          source_lang: string
          source_text: string
          speaker: string
          target_lang: string
          translated_text: string
          via?: string
        }
        Update: {
          created_at?: string
          id?: string
          salon_id?: string
          session_id?: string
          source_lang?: string
          source_text?: string
          speaker?: string
          target_lang?: string
          translated_text?: string
          via?: string
        }
        Relationships: [
          {
            foreignKeyName: "interpreter_turns_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interpreter_turns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interpreter_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          description: string
          ends_at: string | null
          id: string
          is_active: boolean
          salon_id: string
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          salon_id: string
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          salon_id?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_phrases: {
        Row: {
          category: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          salon_id: string | null
          text_en: string
          text_vi: string
        }
        Insert: {
          category: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          salon_id?: string | null
          text_en: string
          text_vi: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          salon_id?: string | null
          text_en?: string
          text_vi?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_phrases_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_gallery: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          salon_id: string
          storage_path: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          salon_id: string
          storage_path?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          salon_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salon_gallery_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["salon_role"]
          salon_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["salon_role"]
          salon_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["salon_role"]
          salon_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_invites_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["salon_role"]
          salon_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["salon_role"]
          salon_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["salon_role"]
          salon_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_members_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salon_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_policies: {
        Row: {
          content: string
          created_at: string
          display_order: number
          id: string
          salon_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          display_order?: number
          id?: string
          salon_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          salon_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_policies_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_profile: {
        Row: {
          address: string
          created_at: string
          email: string
          facebook_link: string | null
          google_map_link: string | null
          google_review_link: string | null
          id: string
          instagram_link: string | null
          name: string
          parking_info: string | null
          phone: string
          salon_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string
          created_at?: string
          email?: string
          facebook_link?: string | null
          google_map_link?: string | null
          google_review_link?: string | null
          id?: string
          instagram_link?: string | null
          name?: string
          parking_info?: string | null
          phone?: string
          salon_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          email?: string
          facebook_link?: string | null
          google_map_link?: string | null
          google_review_link?: string | null
          id?: string
          instagram_link?: string | null
          name?: string
          parking_info?: string | null
          phone?: string
          salon_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_profile_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salons: {
        Row: {
          address: string | null
          ai_can_book: boolean
          ai_enabled: boolean
          ai_greeting: string | null
          booking_buffer_minutes: number
          booking_lead_minutes: number
          booking_slot_minutes: number
          booking_window_days: number
          created_at: string
          created_by: string | null
          email: string | null
          facebook_link: string | null
          google_map_link: string | null
          google_review_link: string | null
          id: string
          instagram_link: string | null
          is_active: boolean
          logo_url: string | null
          name: string
          online_booking_enabled: boolean
          parking_info: string | null
          phone: string | null
          plan: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          ai_can_book?: boolean
          ai_enabled?: boolean
          ai_greeting?: string | null
          booking_buffer_minutes?: number
          booking_lead_minutes?: number
          booking_slot_minutes?: number
          booking_window_days?: number
          created_at?: string
          created_by?: string | null
          email?: string | null
          facebook_link?: string | null
          google_map_link?: string | null
          google_review_link?: string | null
          id?: string
          instagram_link?: string | null
          is_active?: boolean
          logo_url?: string | null
          name: string
          online_booking_enabled?: boolean
          parking_info?: string | null
          phone?: string | null
          plan?: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          ai_can_book?: boolean
          ai_enabled?: boolean
          ai_greeting?: string | null
          booking_buffer_minutes?: number
          booking_lead_minutes?: number
          booking_slot_minutes?: number
          booking_window_days?: number
          created_at?: string
          created_by?: string | null
          email?: string | null
          facebook_link?: string | null
          google_map_link?: string | null
          google_review_link?: string | null
          id?: string
          instagram_link?: string | null
          is_active?: boolean
          logo_url?: string | null
          name?: string
          online_booking_enabled?: boolean
          parking_info?: string | null
          phone?: string | null
          plan?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          salon_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          salon_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          display_order: number
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price_cents: number
          price_label: string | null
          salon_id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price_cents: number
          price_label?: string | null
          salon_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price_cents?: number
          price_label?: string | null
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          bio: string | null
          color: string | null
          created_at: string
          display_order: number
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          photo_url: string | null
          salon_id: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          color?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          photo_url?: string | null
          salon_id: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          color?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          photo_url?: string | null
          salon_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_salon_invite: {
        Args: { p_token: string }
        Returns: {
          address: string | null
          ai_can_book: boolean
          ai_enabled: boolean
          ai_greeting: string | null
          booking_buffer_minutes: number
          booking_lead_minutes: number
          booking_slot_minutes: number
          booking_window_days: number
          created_at: string
          created_by: string | null
          email: string | null
          facebook_link: string | null
          google_map_link: string | null
          google_review_link: string | null
          id: string
          instagram_link: string | null
          is_active: boolean
          logo_url: string | null
          name: string
          online_booking_enabled: boolean
          parking_info: string | null
          phone: string | null
          plan: string
          slug: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "salons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_salon: {
        Args: {
          p_address?: string
          p_email?: string
          p_name: string
          p_phone?: string
          p_slug: string
          p_timezone?: string
        }
        Returns: {
          address: string | null
          ai_can_book: boolean
          ai_enabled: boolean
          ai_greeting: string | null
          booking_buffer_minutes: number
          booking_lead_minutes: number
          booking_slot_minutes: number
          booking_window_days: number
          created_at: string
          created_by: string | null
          email: string | null
          facebook_link: string | null
          google_map_link: string | null
          google_review_link: string | null
          id: string
          instagram_link: string | null
          is_active: boolean
          logo_url: string | null
          name: string
          online_booking_enabled: boolean
          parking_info: string | null
          phone: string | null
          plan: string
          slug: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "salons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dearmor: { Args: { "": string }; Returns: string }
      gen_random_uuid: { Args: Record<PropertyKey, never>; Returns: string }
      gen_salt: { Args: { "": string }; Returns: string }
      get_salon_invite: {
        Args: { p_token: string }
        Returns: {
          accepted_at: string
          email: string
          expires_at: string
          role: Database["public"]["Enums"]["salon_role"]
          salon_name: string
          salon_slug: string
        }[]
      }
      has_salon_role: {
        Args: { p_roles: string[]; p_salon_id: string }
        Returns: boolean
      }
      is_salon_member: { Args: { p_salon_id: string }; Returns: boolean }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
    }
    Enums: {
      appointment_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      chat_role: "user" | "assistant" | "system"
      salon_role: "owner" | "admin" | "staff"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      appointment_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      chat_role: ["user", "assistant", "system"],
      salon_role: ["owner", "admin", "staff"],
    },
  },
} as const
