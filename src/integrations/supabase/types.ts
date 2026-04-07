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
      attempt_answers: {
        Row: {
          attempt_id: string
          created_at: string
          fill_answer: string | null
          id: string
          is_correct: boolean | null
          question_id: string
          selected_option_ids: string[] | null
          updated_at: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          fill_answer?: string | null
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_option_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          fill_answer?: string | null
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option_ids?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          coins_awarded: boolean
          created_at: string
          exam_id: string
          id: string
          is_passed: boolean | null
          score: number | null
          started_at: string
          submitted_at: string | null
          time_taken_seconds: number | null
          total_correct: number | null
          total_skipped: number | null
          total_wrong: number | null
          user_id: string
        }
        Insert: {
          coins_awarded?: boolean
          created_at?: string
          exam_id: string
          id?: string
          is_passed?: boolean | null
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          time_taken_seconds?: number | null
          total_correct?: number | null
          total_skipped?: number | null
          total_wrong?: number | null
          user_id: string
        }
        Update: {
          coins_awarded?: boolean
          created_at?: string
          exam_id?: string
          id?: string
          is_passed?: boolean | null
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          time_taken_seconds?: number | null
          total_correct?: number | null
          total_skipped?: number | null
          total_wrong?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      exam_questions: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          question_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          question_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          ends_at: string | null
          id: string
          max_attempts: number
          negative_mark_value: number
          negative_marking: boolean
          pass_mark: number
          reward_coins: number
          scheduled_at: string | null
          shuffle_options: boolean
          status: Database["public"]["Enums"]["exam_status"]
          title: string
          total_questions: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          ends_at?: string | null
          id?: string
          max_attempts?: number
          negative_mark_value?: number
          negative_marking?: boolean
          pass_mark?: number
          reward_coins?: number
          scheduled_at?: string | null
          shuffle_options?: boolean
          status?: Database["public"]["Enums"]["exam_status"]
          title: string
          total_questions?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          ends_at?: string | null
          id?: string
          max_attempts?: number
          negative_mark_value?: number
          negative_marking?: boolean
          pass_mark?: number
          reward_coins?: number
          scheduled_at?: string | null
          shuffle_options?: boolean
          status?: Database["public"]["Enums"]["exam_status"]
          title?: string
          total_questions?: number
          updated_at?: string
        }
        Relationships: []
      }
      flash_card_answers: {
        Row: {
          card_id: string
          coins_awarded: number
          created_at: string
          id: string
          is_correct: boolean
          session_id: string
          user_answer: string | null
        }
        Insert: {
          card_id: string
          coins_awarded?: number
          created_at?: string
          id?: string
          is_correct?: boolean
          session_id: string
          user_answer?: string | null
        }
        Update: {
          card_id?: string
          coins_awarded?: number
          created_at?: string
          id?: string
          is_correct?: boolean
          session_id?: string
          user_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flash_card_answers_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "flash_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_card_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "flash_card_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_card_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      flash_card_sessions: {
        Row: {
          category_id: string | null
          coins_earned: number
          completed_at: string | null
          correct_answers: number
          created_at: string
          id: string
          total_cards: number
          user_id: string
          wrong_answers: number
        }
        Insert: {
          category_id?: string | null
          coins_earned?: number
          completed_at?: string | null
          correct_answers?: number
          created_at?: string
          id?: string
          total_cards?: number
          user_id: string
          wrong_answers?: number
        }
        Update: {
          category_id?: string | null
          coins_earned?: number
          completed_at?: string | null
          correct_answers?: number
          created_at?: string
          id?: string
          total_cards?: number
          user_id?: string
          wrong_answers?: number
        }
        Relationships: [
          {
            foreignKeyName: "flash_card_sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "flash_card_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_cards: {
        Row: {
          answer: string | null
          card_type: Database["public"]["Enums"]["flash_card_type"]
          category_id: string | null
          coin_points: number
          created_at: string
          created_by: string | null
          difficulty: string
          explanation: string | null
          id: string
          image_url: string | null
          is_enabled: boolean
          options: Json | null
          question: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          answer?: string | null
          card_type?: Database["public"]["Enums"]["flash_card_type"]
          category_id?: string | null
          coin_points?: number
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_enabled?: boolean
          options?: Json | null
          question: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string | null
          card_type?: Database["public"]["Enums"]["flash_card_type"]
          category_id?: string | null
          coin_points?: number
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_enabled?: boolean
          options?: Json | null
          question?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flash_cards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "flash_card_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_settings: {
        Row: {
          callback_base_url: string | null
          config: Json
          created_at: string
          currency: string
          display_name: string
          enable_logging: boolean
          enable_tokenized: boolean
          failure_url: string | null
          id: string
          is_enabled: boolean
          is_sandbox: boolean
          last_standard_connection_status: Database["public"]["Enums"]["payment_connection_status"]
          last_standard_test_message: string | null
          last_standard_tested_at: string | null
          last_tokenized_connection_status: Database["public"]["Enums"]["payment_connection_status"]
          last_tokenized_test_message: string | null
          last_tokenized_tested_at: string | null
          payment_description: string | null
          payment_title: string
          provider: string
          provider_name: string
          redirect_cancel_url: string | null
          redirect_failure_url: string | null
          redirect_success_url: string | null
          show_on_checkout: boolean
          standard_app_key_encrypted: string | null
          standard_app_secret_encrypted: string | null
          standard_base_url: string | null
          standard_create_payment_endpoint: string
          standard_execute_payment_endpoint: string
          standard_grant_token_endpoint: string
          standard_password_encrypted: string | null
          standard_query_payment_endpoint: string
          standard_refresh_token_endpoint: string
          standard_refund_endpoint: string
          standard_search_transaction_endpoint: string
          standard_username_encrypted: string | null
          success_url: string | null
          tokenized_agreement_status_endpoint: string
          tokenized_app_key_encrypted: string | null
          tokenized_app_secret_encrypted: string | null
          tokenized_base_url: string | null
          tokenized_cancel_agreement_endpoint: string
          tokenized_confirm_endpoint: string
          tokenized_create_endpoint: string
          tokenized_execute_endpoint: string
          tokenized_grant_token_endpoint: string
          tokenized_password_encrypted: string | null
          tokenized_payment_status_endpoint: string
          tokenized_refresh_token_endpoint: string
          tokenized_refund_endpoint: string
          tokenized_search_transaction_endpoint: string
          tokenized_username_encrypted: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          callback_base_url?: string | null
          config?: Json
          created_at?: string
          currency?: string
          display_name: string
          enable_logging?: boolean
          enable_tokenized?: boolean
          failure_url?: string | null
          id?: string
          is_enabled?: boolean
          is_sandbox?: boolean
          last_standard_connection_status?: Database["public"]["Enums"]["payment_connection_status"]
          last_standard_test_message?: string | null
          last_standard_tested_at?: string | null
          last_tokenized_connection_status?: Database["public"]["Enums"]["payment_connection_status"]
          last_tokenized_test_message?: string | null
          last_tokenized_tested_at?: string | null
          payment_description?: string | null
          payment_title?: string
          provider: string
          provider_name?: string
          redirect_cancel_url?: string | null
          redirect_failure_url?: string | null
          redirect_success_url?: string | null
          show_on_checkout?: boolean
          standard_app_key_encrypted?: string | null
          standard_app_secret_encrypted?: string | null
          standard_base_url?: string | null
          standard_create_payment_endpoint?: string
          standard_execute_payment_endpoint?: string
          standard_grant_token_endpoint?: string
          standard_password_encrypted?: string | null
          standard_query_payment_endpoint?: string
          standard_refresh_token_endpoint?: string
          standard_refund_endpoint?: string
          standard_search_transaction_endpoint?: string
          standard_username_encrypted?: string | null
          success_url?: string | null
          tokenized_agreement_status_endpoint?: string
          tokenized_app_key_encrypted?: string | null
          tokenized_app_secret_encrypted?: string | null
          tokenized_base_url?: string | null
          tokenized_cancel_agreement_endpoint?: string
          tokenized_confirm_endpoint?: string
          tokenized_create_endpoint?: string
          tokenized_execute_endpoint?: string
          tokenized_grant_token_endpoint?: string
          tokenized_password_encrypted?: string | null
          tokenized_payment_status_endpoint?: string
          tokenized_refresh_token_endpoint?: string
          tokenized_refund_endpoint?: string
          tokenized_search_transaction_endpoint?: string
          tokenized_username_encrypted?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          callback_base_url?: string | null
          config?: Json
          created_at?: string
          currency?: string
          display_name?: string
          enable_logging?: boolean
          enable_tokenized?: boolean
          failure_url?: string | null
          id?: string
          is_enabled?: boolean
          is_sandbox?: boolean
          last_standard_connection_status?: Database["public"]["Enums"]["payment_connection_status"]
          last_standard_test_message?: string | null
          last_standard_tested_at?: string | null
          last_tokenized_connection_status?: Database["public"]["Enums"]["payment_connection_status"]
          last_tokenized_test_message?: string | null
          last_tokenized_tested_at?: string | null
          payment_description?: string | null
          payment_title?: string
          provider?: string
          provider_name?: string
          redirect_cancel_url?: string | null
          redirect_failure_url?: string | null
          redirect_success_url?: string | null
          show_on_checkout?: boolean
          standard_app_key_encrypted?: string | null
          standard_app_secret_encrypted?: string | null
          standard_base_url?: string | null
          standard_create_payment_endpoint?: string
          standard_execute_payment_endpoint?: string
          standard_grant_token_endpoint?: string
          standard_password_encrypted?: string | null
          standard_query_payment_endpoint?: string
          standard_refresh_token_endpoint?: string
          standard_refund_endpoint?: string
          standard_search_transaction_endpoint?: string
          standard_username_encrypted?: string | null
          success_url?: string | null
          tokenized_agreement_status_endpoint?: string
          tokenized_app_key_encrypted?: string | null
          tokenized_app_secret_encrypted?: string | null
          tokenized_base_url?: string | null
          tokenized_cancel_agreement_endpoint?: string
          tokenized_confirm_endpoint?: string
          tokenized_create_endpoint?: string
          tokenized_execute_endpoint?: string
          tokenized_grant_token_endpoint?: string
          tokenized_password_encrypted?: string | null
          tokenized_payment_status_endpoint?: string
          tokenized_refresh_token_endpoint?: string
          tokenized_refund_endpoint?: string
          tokenized_search_transaction_endpoint?: string
          tokenized_username_encrypted?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_gateway_logs: {
        Row: {
          created_at: string
          endpoint_name: string | null
          http_status: number | null
          id: string
          log_type: string
          message: string | null
          provider_name: string
          request_payload: Json
          response_payload: Json
          status: Database["public"]["Enums"]["payment_log_status"]
        }
        Insert: {
          created_at?: string
          endpoint_name?: string | null
          http_status?: number | null
          id?: string
          log_type: string
          message?: string | null
          provider_name?: string
          request_payload?: Json
          response_payload?: Json
          status?: Database["public"]["Enums"]["payment_log_status"]
        }
        Update: {
          created_at?: string
          endpoint_name?: string | null
          http_status?: number | null
          id?: string
          log_type?: string
          message?: string | null
          provider_name?: string
          request_payload?: Json
          response_payload?: Json
          status?: Database["public"]["Enums"]["payment_log_status"]
        }
        Relationships: []
      }
      payment_gateway_tokens: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          expires_at: string | null
          id: string
          last_refreshed_at: string | null
          metadata: Json
          provider_name: string
          refresh_token_encrypted: string | null
          token_masked: string | null
          token_type: string
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_refreshed_at?: string | null
          metadata?: Json
          provider_name?: string
          refresh_token_encrypted?: string | null
          token_masked?: string | null
          token_type: string
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_refreshed_at?: string | null
          metadata?: Json
          provider_name?: string
          refresh_token_encrypted?: string | null
          token_masked?: string | null
          token_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          favicon_url: string | null
          id: number
          logo_url: string | null
          site_subtitle: string
          site_title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          favicon_url?: string | null
          id?: number
          logo_url?: string | null
          site_subtitle?: string
          site_title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          favicon_url?: string | null
          id?: number
          logo_url?: string | null
          site_subtitle?: string
          site_title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      subscription_orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json
          order_notes: string | null
          package_id: string
          payment_method: string
          payment_status: Database["public"]["Enums"]["subscription_payment_status"]
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          order_notes?: string | null
          package_id: string
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["subscription_payment_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          order_notes?: string | null
          package_id?: string
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["subscription_payment_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "subscription_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_package_features: {
        Row: {
          created_at: string
          feature_key: string
          feature_label: string
          feature_type: Database["public"]["Enums"]["package_feature_type"]
          feature_value: string | null
          icon_type: Database["public"]["Enums"]["package_feature_icon_type"]
          id: string
          is_active: boolean
          is_highlighted: boolean
          package_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          feature_key: string
          feature_label: string
          feature_type?: Database["public"]["Enums"]["package_feature_type"]
          feature_value?: string | null
          icon_type?: Database["public"]["Enums"]["package_feature_icon_type"]
          id?: string
          is_active?: boolean
          is_highlighted?: boolean
          package_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          feature_key?: string
          feature_label?: string
          feature_type?: Database["public"]["Enums"]["package_feature_type"]
          feature_value?: string | null
          icon_type?: Database["public"]["Enums"]["package_feature_icon_type"]
          id?: string
          is_active?: boolean
          is_highlighted?: boolean
          package_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_package_features_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "subscription_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_packages: {
        Row: {
          accent_color: string | null
          active: boolean
          allow_downgrade: boolean
          allow_upgrade: boolean
          available_for_guests: boolean
          available_for_logged_in: boolean
          badge_color: string | null
          badge_text: string | null
          billing_type: Database["public"]["Enums"]["subscription_billing_type"]
          button_text: string
          button_url: string | null
          created_at: string
          currency: string
          duration_type: Database["public"]["Enums"]["subscription_duration_type"]
          duration_value: number | null
          full_description: string | null
          id: string
          is_highlighted: boolean
          is_lifetime: boolean
          is_popular: boolean
          limit_purchase_per_user: number | null
          metadata: Json
          name: string
          regular_price: number
          renewal_allowed: boolean
          sale_price: number | null
          short_description: string | null
          show_on_homepage: boolean
          show_on_pricing_page: boolean
          slug: string
          sort_order: number
          trial_days: number | null
          trial_enabled: boolean
          updated_at: string
          visibility: string
        }
        Insert: {
          accent_color?: string | null
          active?: boolean
          allow_downgrade?: boolean
          allow_upgrade?: boolean
          available_for_guests?: boolean
          available_for_logged_in?: boolean
          badge_color?: string | null
          badge_text?: string | null
          billing_type?: Database["public"]["Enums"]["subscription_billing_type"]
          button_text?: string
          button_url?: string | null
          created_at?: string
          currency?: string
          duration_type?: Database["public"]["Enums"]["subscription_duration_type"]
          duration_value?: number | null
          full_description?: string | null
          id?: string
          is_highlighted?: boolean
          is_lifetime?: boolean
          is_popular?: boolean
          limit_purchase_per_user?: number | null
          metadata?: Json
          name: string
          regular_price?: number
          renewal_allowed?: boolean
          sale_price?: number | null
          short_description?: string | null
          show_on_homepage?: boolean
          show_on_pricing_page?: boolean
          slug: string
          sort_order?: number
          trial_days?: number | null
          trial_enabled?: boolean
          updated_at?: string
          visibility?: string
        }
        Update: {
          accent_color?: string | null
          active?: boolean
          allow_downgrade?: boolean
          allow_upgrade?: boolean
          available_for_guests?: boolean
          available_for_logged_in?: boolean
          badge_color?: string | null
          badge_text?: string | null
          billing_type?: Database["public"]["Enums"]["subscription_billing_type"]
          button_text?: string
          button_url?: string | null
          created_at?: string
          currency?: string
          duration_type?: Database["public"]["Enums"]["subscription_duration_type"]
          duration_value?: number | null
          full_description?: string | null
          id?: string
          is_highlighted?: boolean
          is_lifetime?: boolean
          is_popular?: boolean
          limit_purchase_per_user?: number | null
          metadata?: Json
          name?: string
          regular_price?: number
          renewal_allowed?: boolean
          sale_price?: number | null
          short_description?: string | null
          show_on_homepage?: boolean
          show_on_pricing_page?: boolean
          slug?: string
          sort_order?: number
          trial_days?: number | null
          trial_enabled?: boolean
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      subscription_settings: {
        Row: {
          created_at: string
          currency_symbol: string
          id: number
          pricing_enabled: boolean
          pricing_page_subtitle: string
          pricing_page_title: string
          show_comparison_table: boolean
          show_discount_badge: boolean
          show_faq: boolean
          show_popular_ribbon: boolean
          show_support_block: boolean
          show_testimonials: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_symbol?: string
          id?: number
          pricing_enabled?: boolean
          pricing_page_subtitle?: string
          pricing_page_title?: string
          show_comparison_table?: boolean
          show_discount_badge?: boolean
          show_faq?: boolean
          show_popular_ribbon?: boolean
          show_support_block?: boolean
          show_testimonials?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_symbol?: string
          id?: number
          pricing_enabled?: boolean
          pricing_page_subtitle?: string
          pricing_page_title?: string
          show_comparison_table?: boolean
          show_discount_badge?: boolean
          show_faq?: boolean
          show_popular_ribbon?: boolean
          show_support_block?: boolean
          show_testimonials?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          amount_paid: number
          created_at: string
          currency: string
          end_date: string | null
          id: string
          is_lifetime: boolean
          metadata: Json
          order_id: string | null
          package_id: string | null
          package_name: string
          payment_status: Database["public"]["Enums"]["subscription_payment_status"]
          renewal_date: string | null
          start_date: string
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          is_lifetime?: boolean
          metadata?: Json
          order_id?: string | null
          package_id?: string | null
          package_name: string
          payment_status?: Database["public"]["Enums"]["subscription_payment_status"]
          renewal_date?: string | null
          start_date?: string
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          is_lifetime?: boolean
          metadata?: Json
          order_id?: string | null
          package_id?: string | null
          package_name?: string
          payment_status?: Database["public"]["Enums"]["subscription_payment_status"]
          renewal_date?: string | null
          start_date?: string
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "subscription_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "subscription_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          coin_balance: number
          created_at: string
          current_package_id: string | null
          current_subscription_id: string | null
          full_name: string
          id: string
          last_login_at: string | null
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          coin_balance?: number
          created_at?: string
          current_package_id?: string | null
          current_subscription_id?: string | null
          full_name?: string
          id?: string
          last_login_at?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          coin_balance?: number
          created_at?: string
          current_package_id?: string | null
          current_subscription_id?: string | null
          full_name?: string
          id?: string
          last_login_at?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_options: {
        Row: {
          created_at: string
          explanation: string | null
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          explanation?: string | null
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_package_id_fkey"
            columns: ["current_package_id"]
            isOneToOne: false
            referencedRelation: "subscription_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_subscription_id_fkey"
            columns: ["current_subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "question_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      question_reports: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          message: string | null
          question_id: string
          report_type: string
          reported_by: string
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          message?: string | null
          question_id: string
          report_type: string
          reported_by: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          message?: string | null
          question_id?: string
          report_type?: string
          reported_by?: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
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
          category: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string | null
          id: string
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          subcategory_id: string | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          subcategory_id?: string | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          subcategory_id?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "question_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "question_subcategories"
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
      get_bkash_token_statuses: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          expires_at: string | null
          last_refreshed_at: string | null
          token_exists: boolean
          token_masked: string | null
          token_type: string
          updated_at: string
        }[]
      }
      get_public_global_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          full_name: string
          passed_exams: number
          points: number
          rank: number
          user_id: string
        }[]
      }
      get_public_leaderboard: {
        Args: { p_exam_id: string; p_limit?: number }
        Returns: {
          coin_balance: number
          exams_given: number
          full_name: string
          rank: number
          score: number
          time_taken_seconds: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      get_public_bkash_config: {
        Args: Record<PropertyKey, never>
        Returns: {
          currency: string
          enable_tokenized: boolean
          environment_mode: string
          is_enabled: boolean
          payment_description: string | null
          payment_title: string
          provider_name: string
          show_on_checkout: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "student"
      difficulty_level: "easy" | "medium" | "hard"
      exam_status: "draft" | "scheduled" | "live" | "ended"
      flash_card_type: "flip" | "mcq" | "true_false" | "image"
      payment_connection_status: "connected" | "failed" | "not_tested"
      payment_log_status: "success" | "error" | "warning" | "info"
      package_feature_icon_type: "check" | "cross" | "badge" | "numeric_pill"
      package_feature_type: "text" | "boolean" | "number" | "unlimited" | "not_included"
      question_type: "mcq" | "fill_blank" | "multi_select"
      report_status: "pending" | "reviewed" | "fixed" | "rejected"
      subscription_billing_type: "one_time" | "recurring"
      subscription_duration_type: "days" | "months" | "years" | "lifetime"
      subscription_payment_status: "pending" | "paid" | "failed" | "expired" | "cancelled"
      subscription_status: "active" | "expired" | "cancelled" | "pending" | "lifetime"
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
      app_role: ["admin", "student"],
      difficulty_level: ["easy", "medium", "hard"],
      exam_status: ["draft", "scheduled", "live", "ended"],
      flash_card_type: ["flip", "mcq", "true_false", "image"],
      payment_connection_status: ["connected", "failed", "not_tested"],
      payment_log_status: ["success", "error", "warning", "info"],
      package_feature_icon_type: ["check", "cross", "badge", "numeric_pill"],
      package_feature_type: ["text", "boolean", "number", "unlimited", "not_included"],
      question_type: ["mcq", "fill_blank", "multi_select"],
      report_status: ["pending", "reviewed", "fixed", "rejected"],
      subscription_billing_type: ["one_time", "recurring"],
      subscription_duration_type: ["days", "months", "years", "lifetime"],
      subscription_payment_status: ["pending", "paid", "failed", "expired", "cancelled"],
      subscription_status: ["active", "expired", "cancelled", "pending", "lifetime"],
    },
  },
} as const
