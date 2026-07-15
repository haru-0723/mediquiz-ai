export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bulk_posts: {
        Row: {
          character_id: string
          content: string
          created_at: string
          day_of_week: string
          delivered: boolean
          delivered_at: string | null
          id: string
          length_mode: string
          post_type: string
          week_start: string
        }
        Insert: {
          character_id?: string
          content: string
          created_at?: string
          day_of_week: string
          delivered?: boolean
          delivered_at?: string | null
          id?: string
          length_mode?: string
          post_type: string
          week_start: string
        }
        Update: {
          character_id?: string
          content?: string
          created_at?: string
          day_of_week?: string
          delivered?: boolean
          delivered_at?: string | null
          id?: string
          length_mode?: string
          post_type?: string
          week_start?: string
        }
        Relationships: []
      }
      cbt_logs: {
        Row: { created_at: string | null; id: string; user_id: string }
        Insert: { created_at?: string | null; id?: string; user_id: string }
        Update: { created_at?: string | null; id?: string; user_id?: string }
        Relationships: []
      }
      check_results: {
        Row: {
          correct_count: number
          created_at: string
          id: string
          questions_count: number
          unit_id: string
          user_id: string
        }
        Insert: {
          correct_count: number
          created_at?: string
          id?: string
          questions_count?: number
          unit_id: string
          user_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          id?: string
          questions_count?: number
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_results_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string | null
          exam_date: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exam_date: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          exam_date?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      explain_cache: {
        Row: { created_at: string | null; explanation: string; id: string; question_hash: string }
        Insert: { created_at?: string | null; explanation: string; id?: string; question_hash: string }
        Update: { created_at?: string | null; explanation?: string; id?: string; question_hash?: string }
        Relationships: []
      }
      explain_logs: {
        Row: { created_at: string; id: string; user_id: string }
        Insert: { created_at?: string; id?: string; user_id: string }
        Update: { created_at?: string; id?: string; user_id?: string }
        Relationships: []
      }
      folders: {
        Row: { created_at: string | null; id: string; name: string; user_id: string }
        Insert: { created_at?: string | null; id?: string; name: string; user_id: string }
        Update: { created_at?: string | null; id?: string; name?: string; user_id?: string }
        Relationships: []
      }
      generate_logs: {
        Row: { created_at: string | null; id: string; user_id: string }
        Insert: { created_at?: string | null; id?: string; user_id: string }
        Update: { created_at?: string | null; id?: string; user_id?: string }
        Relationships: []
      }
      kokushi_logs: {
        Row: { created_at: string | null; id: string; user_id: string }
        Insert: { created_at?: string | null; id?: string; user_id: string }
        Update: { created_at?: string | null; id?: string; user_id?: string }
        Relationships: []
      }
      materials: {
        Row: {
          created_at: string | null
          file_type: string | null
          file_url: string
          folder_id: string | null
          id: string
          subject: string | null
          title: string
          unit_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_type?: string | null
          file_url: string
          folder_id?: string | null
          id?: string
          subject?: string | null
          title: string
          unit_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_type?: string | null
          file_url?: string
          folder_id?: string | null
          id?: string
          subject?: string | null
          title?: string
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          partner_name: string
          trial_days: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          partner_name: string
          trial_days?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          partner_name?: string
          trial_days?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          fcm_token: string | null
          generate_credits: number
          grade: number | null
          id: string
          name: string | null
          plan: string | null
          plan_expires_at: string | null
          push_subscription: Json | null
          streak_days: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          target_exam: string | null
          trial_ends_at: string | null
          university: string | null
          weekly_minutes: number | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          fcm_token?: string | null
          generate_credits?: number
          grade?: number | null
          id: string
          name?: string | null
          plan?: string | null
          plan_expires_at?: string | null
          push_subscription?: Json | null
          streak_days?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          target_exam?: string | null
          trial_ends_at?: string | null
          university?: string | null
          weekly_minutes?: number | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          fcm_token?: string | null
          generate_credits?: number
          grade?: number | null
          id?: string
          name?: string | null
          plan?: string | null
          plan_expires_at?: string | null
          push_subscription?: Json | null
          streak_days?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          target_exam?: string | null
          trial_ends_at?: string | null
          university?: string | null
          weekly_minutes?: number | null
        }
        Relationships: []
      }
      question_reports: {
        Row: {
          created_at: string | null
          id: string
          question_id: string
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id: string
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answer: string
          created_at: string | null
          department_type: string | null
          difficulty: string | null
          explanation: string | null
          folder_id: string | null
          id: string
          is_cbt: boolean
          is_kokushi: boolean
          kokushi_type: string | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          subject: string | null
          unit_id: string | null
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string | null
          department_type?: string | null
          difficulty?: string | null
          explanation?: string | null
          folder_id?: string | null
          id?: string
          is_cbt?: boolean
          is_kokushi?: boolean
          kokushi_type?: string | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          subject?: string | null
          unit_id?: string | null
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string | null
          department_type?: string | null
          difficulty?: string | null
          explanation?: string | null
          folder_id?: string | null
          id?: string
          is_cbt?: boolean
          is_kokushi?: boolean
          kokushi_type?: string | null
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
          subject?: string | null
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          bookmarked: boolean
          id: string
          is_correct: boolean
          question_id: string
          session_id: string
          user_answer: string | null
        }
        Insert: {
          bookmarked?: boolean
          id?: string
          is_correct?: boolean
          question_id: string
          session_id: string
          user_answer?: string | null
        }
        Update: {
          bookmarked?: boolean
          id?: string
          is_correct?: boolean
          question_id?: string
          session_id?: string
          user_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          completed_at: string | null
          correct_count: number
          duration_seconds: number | null
          id: string
          material_id: string | null
          mode: string
          subject: string | null
          total_questions: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          correct_count?: number
          duration_seconds?: number | null
          id?: string
          material_id?: string | null
          mode?: string
          subject?: string | null
          total_questions: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          correct_count?: number
          duration_seconds?: number | null
          id?: string
          material_id?: string | null
          mode?: string
          subject?: string | null
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      study_logs: {
        Row: {
          created_at: string
          id: string
          source: string
          studied_on: string
          unit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source?: string
          studied_on?: string
          unit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source?: string
          studied_on?: string
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_logs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: { display_order: number; id: string; name: string }
        Insert: { display_order?: number; id?: string; name: string }
        Update: { display_order?: number; id?: string; name?: string }
        Relationships: []
      }
      today_dismissals: {
        Row: { created_at: string; dismissed_on: string; reason: string | null; unit_id: string; user_id: string }
        Insert: { created_at?: string; dismissed_on?: string; reason?: string | null; unit_id: string; user_id: string }
        Update: { created_at?: string; dismissed_on?: string; reason?: string | null; unit_id?: string; user_id?: string }
        Relationships: [
          {
            foreignKeyName: "today_dismissals_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      today_questions: {
        Row: { created_at: string; date: string; department_type: string; id: string; questions: Json }
        Insert: { created_at?: string; date: string; department_type: string; id?: string; questions?: Json }
        Update: { created_at?: string; date?: string; department_type?: string; id?: string; questions?: Json }
        Relationships: []
      }
      unit_question_bank: {
        Row: {
          answer: string
          created_at: string
          difficulty: string
          exam_type: string
          explanation: string
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          unit_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          difficulty?: string
          exam_type: string
          explanation: string
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          unit_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          difficulty?: string
          exam_type?: string
          explanation?: string
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_question_bank_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_scopes: {
        Row: { exam_type: string; grade: number; importance: number; unit_id: string }
        Insert: { exam_type: string; grade?: number; importance?: number; unit_id: string }
        Update: { exam_type?: string; grade?: number; importance?: number; unit_id?: string }
        Relationships: [
          {
            foreignKeyName: "unit_scopes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: { display_order: number; id: string; name: string; subject_id: string }
        Insert: { display_order?: number; id?: string; name: string; subject_id: string }
        Update: { display_order?: number; id?: string; name?: string; subject_id?: string }
        Relationships: [
          {
            foreignKeyName: "units_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_exam_settings: {
        Row: {
          created_at: string
          exam_date: string
          exam_type: string
          grade: number | null
          id: string
          is_active: boolean
          subject_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_date: string
          exam_type: string
          grade?: number | null
          id?: string
          is_active?: boolean
          subject_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          exam_date?: string
          exam_type?: string
          grade?: number | null
          id?: string
          is_active?: boolean
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_exam_settings_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subject_goals: {
        Row: {
          baseline_accuracy: number | null
          baseline_date: string | null
          subject_id: string
          target_accuracy: number
          user_id: string
        }
        Insert: {
          baseline_accuracy?: number | null
          baseline_date?: string | null
          subject_id: string
          target_accuracy?: number
          user_id: string
        }
        Update: {
          baseline_accuracy?: number | null
          baseline_date?: string | null
          subject_id?: string
          target_accuracy?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subject_goals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_unit_progress: {
        Row: {
          answered_count: number
          correct_count: number
          last_studied_at: string | null
          target_accuracy: number | null
          unit_id: string
          user_id: string
        }
        Insert: {
          answered_count?: number
          correct_count?: number
          last_studied_at?: string | null
          target_accuracy?: number | null
          unit_id: string
          user_id: string
        }
        Update: {
          answered_count?: number
          correct_count?: number
          last_studied_at?: string | null
          target_accuracy?: number | null
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unit_progress_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_generate_credits: {
        Args: { p_amount: number; p_reset?: boolean; p_user_id: string }
        Returns: undefined
      }
      consume_generate_credit: { Args: { p_user_id: string }; Returns: boolean }
      consume_usage_quota: {
        Args: { p_limit: number; p_period: string; p_table: string; p_user_id: string }
        Returns: string
      }
      refund_generate_credit: { Args: { p_user_id: string }; Returns: undefined }
      release_usage_quota: { Args: { p_log_id: string; p_table: string }; Returns: undefined }
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
