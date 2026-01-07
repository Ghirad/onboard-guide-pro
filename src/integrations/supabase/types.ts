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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      setup_configurations: {
        Row: {
          action_type_styles: Json | null
          allowed_routes: string[] | null
          api_key: string
          auto_start: boolean | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          target_url: string
          theme_background_color: string | null
          theme_border_radius: string | null
          theme_highlight_animation: string | null
          theme_primary_color: string | null
          theme_secondary_color: string | null
          theme_template: string | null
          theme_text_color: string | null
          updated_at: string
          user_id: string
          widget_position: string | null
        }
        Insert: {
          action_type_styles?: Json | null
          allowed_routes?: string[] | null
          api_key?: string
          auto_start?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          target_url: string
          theme_background_color?: string | null
          theme_border_radius?: string | null
          theme_highlight_animation?: string | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          theme_template?: string | null
          theme_text_color?: string | null
          updated_at?: string
          user_id: string
          widget_position?: string | null
        }
        Update: {
          action_type_styles?: Json | null
          allowed_routes?: string[] | null
          api_key?: string
          auto_start?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          target_url?: string
          theme_background_color?: string | null
          theme_border_radius?: string | null
          theme_highlight_animation?: string | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          theme_template?: string | null
          theme_text_color?: string | null
          updated_at?: string
          user_id?: string
          widget_position?: string | null
        }
        Relationships: []
      }
      setup_steps: {
        Row: {
          configuration_id: string
          created_at: string
          default_next_step_id: string | null
          description: string | null
          id: string
          image_url: string | null
          instructions: string | null
          is_branch_point: boolean | null
          is_required: boolean
          position_x: number | null
          position_y: number | null
          show_next_button: boolean
          step_order: number
          target_selector: string | null
          target_type: Database["public"]["Enums"]["step_target_type"]
          target_url: string | null
          theme_override: Json | null
          tips: string | null
          title: string
          tooltip_position: string | null
          updated_at: string
        }
        Insert: {
          configuration_id: string
          created_at?: string
          default_next_step_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_branch_point?: boolean | null
          is_required?: boolean
          position_x?: number | null
          position_y?: number | null
          show_next_button?: boolean
          step_order: number
          target_selector?: string | null
          target_type?: Database["public"]["Enums"]["step_target_type"]
          target_url?: string | null
          theme_override?: Json | null
          tips?: string | null
          title: string
          tooltip_position?: string | null
          updated_at?: string
        }
        Update: {
          configuration_id?: string
          created_at?: string
          default_next_step_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_branch_point?: boolean | null
          is_required?: boolean
          position_x?: number | null
          position_y?: number | null
          show_next_button?: boolean
          step_order?: number
          target_selector?: string | null
          target_type?: Database["public"]["Enums"]["step_target_type"]
          target_url?: string | null
          theme_override?: Json | null
          tips?: string | null
          title?: string
          tooltip_position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_steps_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "setup_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setup_steps_default_next_step_id_fkey"
            columns: ["default_next_step_id"]
            isOneToOne: false
            referencedRelation: "setup_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      step_actions: {
        Row: {
          action_order: number
          action_type: Database["public"]["Enums"]["action_type"]
          created_at: string
          delay_ms: number | null
          description: string | null
          highlight_animation:
            | Database["public"]["Enums"]["highlight_animation"]
            | null
          highlight_color: string | null
          highlight_duration_ms: number | null
          id: string
          input_type: string | null
          redirect_delay_ms: number | null
          redirect_type: string | null
          redirect_url: string | null
          redirect_wait_for_load: boolean | null
          scroll_behavior: string | null
          scroll_position: string | null
          scroll_to_element: boolean | null
          selector: string | null
          step_id: string
          value: string | null
          wait_for_element: boolean | null
        }
        Insert: {
          action_order: number
          action_type: Database["public"]["Enums"]["action_type"]
          created_at?: string
          delay_ms?: number | null
          description?: string | null
          highlight_animation?:
            | Database["public"]["Enums"]["highlight_animation"]
            | null
          highlight_color?: string | null
          highlight_duration_ms?: number | null
          id?: string
          input_type?: string | null
          redirect_delay_ms?: number | null
          redirect_type?: string | null
          redirect_url?: string | null
          redirect_wait_for_load?: boolean | null
          scroll_behavior?: string | null
          scroll_position?: string | null
          scroll_to_element?: boolean | null
          selector?: string | null
          step_id: string
          value?: string | null
          wait_for_element?: boolean | null
        }
        Update: {
          action_order?: number
          action_type?: Database["public"]["Enums"]["action_type"]
          created_at?: string
          delay_ms?: number | null
          description?: string | null
          highlight_animation?:
            | Database["public"]["Enums"]["highlight_animation"]
            | null
          highlight_color?: string | null
          highlight_duration_ms?: number | null
          id?: string
          input_type?: string | null
          redirect_delay_ms?: number | null
          redirect_type?: string | null
          redirect_url?: string | null
          redirect_wait_for_load?: boolean | null
          scroll_behavior?: string | null
          scroll_position?: string | null
          scroll_to_element?: boolean | null
          selector?: string | null
          step_id?: string
          value?: string | null
          wait_for_element?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "step_actions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "setup_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      step_branches: {
        Row: {
          branch_order: number | null
          condition_label: string
          condition_type: string
          condition_value: string | null
          created_at: string | null
          id: string
          next_step_id: string | null
          step_id: string
        }
        Insert: {
          branch_order?: number | null
          condition_label: string
          condition_type?: string
          condition_value?: string | null
          created_at?: string | null
          id?: string
          next_step_id?: string | null
          step_id: string
        }
        Update: {
          branch_order?: number | null
          condition_label?: string
          condition_type?: string
          condition_value?: string | null
          created_at?: string | null
          id?: string
          next_step_id?: string | null
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_branches_next_step_id_fkey"
            columns: ["next_step_id"]
            isOneToOne: false
            referencedRelation: "setup_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_branches_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "setup_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_branch_choices: {
        Row: {
          branch_id: string
          client_id: string
          configuration_id: string
          created_at: string | null
          id: string
          step_id: string
        }
        Insert: {
          branch_id: string
          client_id: string
          configuration_id: string
          created_at?: string | null
          id?: string
          step_id: string
        }
        Update: {
          branch_id?: string
          client_id?: string
          configuration_id?: string
          created_at?: string | null
          id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branch_choices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "step_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_choices_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "setup_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_choices_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "setup_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          client_id: string
          completed_at: string | null
          configuration_id: string
          created_at: string
          id: string
          skipped_at: string | null
          status: string
          step_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          configuration_id: string
          created_at?: string
          id?: string
          skipped_at?: string | null
          status?: string
          step_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          configuration_id?: string
          created_at?: string
          id?: string
          skipped_at?: string | null
          status?: string
          step_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "setup_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "setup_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      action_type:
        | "click"
        | "input"
        | "scroll"
        | "wait"
        | "highlight"
        | "open_modal"
        | "redirect"
      app_role: "admin" | "user"
      highlight_animation: "pulse" | "glow" | "border"
      step_target_type: "page" | "modal"
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
      action_type: [
        "click",
        "input",
        "scroll",
        "wait",
        "highlight",
        "open_modal",
        "redirect",
      ],
      app_role: ["admin", "user"],
      highlight_animation: ["pulse", "glow", "border"],
      step_target_type: ["page", "modal"],
    },
  },
} as const
