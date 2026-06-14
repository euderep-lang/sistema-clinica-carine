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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          cancel_reason: string | null
          created_at: string | null
          created_by: string | null
          date: string
          end_time: string
          id: string
          notes: string | null
          patient_id: string | null
          professional_id: string | null
          room_id: string | null
          specialty: string | null
          start_time: string
          status: string | null
          tenant_id: string | null
          type: string | null
        }
        Insert: {
          cancel_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          end_time: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          professional_id?: string | null
          room_id?: string | null
          specialty?: string | null
          start_time: string
          status?: string | null
          tenant_id?: string | null
          type?: string | null
        }
        Update: {
          cancel_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          end_time?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          professional_id?: string | null
          room_id?: string | null
          specialty?: string | null
          start_time?: string
          status?: string | null
          tenant_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bills_payable: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          status: string
          supplier: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          status?: string
          supplier?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          status?: string
          supplier?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_payable_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bills_receivable: {
        Row: {
          amount: number
          appointment_id: string | null
          budget_id: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          notes: string | null
          paid_amount: number
          paid_date: string | null
          patient_id: string | null
          payment_method: string | null
          professional_id: string | null
          receipt_number: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          appointment_id?: string | null
          budget_id?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          notes?: string | null
          paid_amount?: number
          paid_date?: string | null
          patient_id?: string | null
          payment_method?: string | null
          professional_id?: string | null
          receipt_number?: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          budget_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_amount?: number
          paid_date?: string | null
          patient_id?: string | null
          payment_method?: string | null
          professional_id?: string | null
          receipt_number?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_receivable_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_receivable_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_receivable_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_receivable_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_receivable_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_closings: {
        Row: {
          adjusted_commission_pct: number | null
          appointments_completed: number
          base_commission_pct: number
          closed_at: string | null
          closed_by: string | null
          commission_amount: number
          created_at: string
          id: string
          notes: string | null
          pending_total: number
          period_month: number
          period_year: number
          production_total: number
          professional_id: string
          received_total: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          adjusted_commission_pct?: number | null
          appointments_completed?: number
          base_commission_pct?: number
          closed_at?: string | null
          closed_by?: string | null
          commission_amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          pending_total?: number
          period_month: number
          period_year: number
          production_total?: number
          professional_id: string
          received_total?: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          adjusted_commission_pct?: number | null
          appointments_completed?: number
          base_commission_pct?: number
          closed_at?: string | null
          closed_by?: string | null
          commission_amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          pending_total?: number
          period_month?: number
          period_year?: number
          production_total?: number
          professional_id?: string
          received_total?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_closings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_closings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_closings_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_attachments: {
        Row: {
          caption: string | null
          created_at: string
          evolution_id: string
          file_name: string
          file_size_kb: number
          id: string
          mime_type: string
          patient_id: string
          professional_id: string | null
          storage_path: string
          tenant_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          evolution_id: string
          file_name: string
          file_size_kb?: number
          id?: string
          mime_type: string
          patient_id: string
          professional_id?: string | null
          storage_path: string
          tenant_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          evolution_id?: string
          file_name?: string
          file_size_kb?: number
          id?: string
          mime_type?: string
          patient_id?: string
          professional_id?: string | null
          storage_path?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_attachments_evolution_id_fkey"
            columns: ["evolution_id"]
            isOneToOne: false
            referencedRelation: "patient_evolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_attachments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_attachments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          budget_id: string
          created_at: string
          description: string
          id: string
          position: number
          quantity: number
          service_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          budget_id: string
          created_at?: string
          description: string
          id?: string
          position?: number
          quantity?: number
          service_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Update: {
          budget_id?: string
          created_at?: string
          description?: string
          id?: string
          position?: number
          quantity?: number
          service_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string
          date: string
          discount_percent: number
          discount_value: number
          final_value: number
          id: string
          notes: string | null
          number: number
          patient_id: string | null
          professional_id: string | null
          status: string
          subtotal: number
          tenant_id: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          discount_percent?: number
          discount_value?: number
          final_value?: number
          id?: string
          notes?: string | null
          number?: number
          patient_id?: string | null
          professional_id?: string | null
          status?: string
          subtotal?: number
          tenant_id: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          discount_percent?: number
          discount_value?: number
          final_value?: number
          id?: string
          notes?: string | null
          number?: number
          patient_id?: string | null
          professional_id?: string | null
          status?: string
          subtotal?: number
          tenant_id?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          active: boolean
          brand: string | null
          category_id: string | null
          cost_price: number
          created_at: string
          current_stock: number
          description: string | null
          id: string
          max_stock: number | null
          min_stock: number
          name: string
          sell_price: number
          sku: string | null
          tenant_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          max_stock?: number | null
          min_stock?: number
          name: string
          sell_price?: number
          sku?: string | null
          tenant_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          max_stock?: number | null
          min_stock?: number
          name?: string
          sell_price?: number
          sku?: string | null
          tenant_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          item_id: string
          notes: string | null
          patient_id: string | null
          professional_id: string | null
          quantity: number
          reason: string | null
          tenant_id: string
          type: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          item_id: string
          notes?: string | null
          patient_id?: string | null
          professional_id?: string | null
          quantity: number
          reason?: string | null
          tenant_id: string
          type: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          item_id?: string
          notes?: string | null
          patient_id?: string | null
          professional_id?: string | null
          quantity?: number
          reason?: string | null
          tenant_id?: string
          type?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          appointment_id: string | null
          chief_complaint: string | null
          conduct: string | null
          created_at: string
          date: string
          diagnosis: string | null
          history: string | null
          icd10_code: string | null
          icd10_description: string | null
          id: string
          notes: string | null
          patient_id: string
          physical_exam: string | null
          professional_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          chief_complaint?: string | null
          conduct?: string | null
          created_at?: string
          date?: string
          diagnosis?: string | null
          history?: string | null
          icd10_code?: string | null
          icd10_description?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          physical_exam?: string | null
          professional_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          chief_complaint?: string | null
          conduct?: string | null
          created_at?: string
          date?: string
          diagnosis?: string | null
          history?: string | null
          icd10_code?: string | null
          icd10_description?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          physical_exam?: string | null
          professional_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          campaign_id: string | null
          channel: string
          content: string
          error_message: string | null
          id: string
          patient_id: string | null
          sent_at: string
          sent_by: string | null
          status: string
          template_id: string | null
          tenant_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          channel: string
          content: string
          error_message?: string | null
          id?: string
          patient_id?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          channel?: string
          content?: string
          error_message?: string | null
          id?: string
          patient_id?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          active: boolean
          channel: string
          content: string
          created_at: string
          id: string
          name: string
          tenant_id: string
          trigger: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          channel: string
          content: string
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          trigger: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          channel?: string
          content?: string
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_evolutions: {
        Row: {
          blood_glucose: number | null
          bp_diastolic: number | null
          bp_systolic: number | null
          created_at: string
          date: string
          evolution_text: string
          heart_rate: number | null
          height: number | null
          id: string
          medical_record_id: string | null
          patient_id: string
          professional_id: string | null
          spo2: number | null
          temperature: number | null
          tenant_id: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          blood_glucose?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          date?: string
          evolution_text: string
          heart_rate?: number | null
          height?: number | null
          id?: string
          medical_record_id?: string | null
          patient_id: string
          professional_id?: string | null
          spo2?: number | null
          temperature?: number | null
          tenant_id: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          blood_glucose?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          date?: string
          evolution_text?: string
          heart_rate?: number | null
          height?: number | null
          id?: string
          medical_record_id?: string | null
          patient_id?: string
          professional_id?: string | null
          spo2?: number | null
          temperature?: number | null
          tenant_id?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_evolutions_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_evolutions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_evolutions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_evolutions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          active: boolean | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          allergies: string | null
          birth_date: string | null
          blood_type: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: string | null
          health_insurance: string | null
          health_insurance_number: string | null
          how_did_you_find_us: string | null
          id: string
          notes: string | null
          phone: string | null
          record_number: number | null
          rg: string | null
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          allergies?: string | null
          birth_date?: string | null
          blood_type?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: string | null
          health_insurance?: string | null
          health_insurance_number?: string | null
          how_did_you_find_us?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          record_number?: number | null
          rg?: string | null
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          allergies?: string | null
          birth_date?: string | null
          blood_type?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: string | null
          health_insurance?: string | null
          health_insurance_number?: string | null
          how_did_you_find_us?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          record_number?: number | null
          rg?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          concentration: string | null
          created_at: string
          dosage: string | null
          duration: string | null
          frequency: string | null
          id: string
          instructions: string | null
          medication: string
          pharmaceutical_form: string | null
          position: number
          prescription_id: string
          quantity: string | null
          route: string | null
        }
        Insert: {
          concentration?: string | null
          created_at?: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medication: string
          pharmaceutical_form?: string | null
          position: number
          prescription_id: string
          quantity?: string | null
          route?: string | null
        }
        Update: {
          concentration?: string | null
          created_at?: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medication?: string
          pharmaceutical_form?: string | null
          position?: number
          prescription_id?: string
          quantity?: string | null
          route?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          appointment_id: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          patient_id: string
          pdf_url: string | null
          professional_id: string
          status: string
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          patient_id: string
          pdf_url?: string | null
          professional_id: string
          status?: string
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          patient_id?: string
          pdf_url?: string | null
          professional_id?: string
          status?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          appointment_types: string[] | null
          avatar_url: string | null
          commission_pct: number | null
          cpf: string | null
          created_at: string | null
          crm: string | null
          full_name: string
          id: string
          letterhead_margin_bottom_mm: number
          letterhead_margin_left_mm: number
          letterhead_margin_right_mm: number
          letterhead_margin_top_mm: number
          letterhead_path: string | null
          phone: string | null
          role: string
          specialty: string | null
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          appointment_types?: string[] | null
          avatar_url?: string | null
          commission_pct?: number | null
          cpf?: string | null
          created_at?: string | null
          crm?: string | null
          full_name: string
          id: string
          letterhead_margin_bottom_mm?: number
          letterhead_margin_left_mm?: number
          letterhead_margin_right_mm?: number
          letterhead_margin_top_mm?: number
          letterhead_path?: string | null
          phone?: string | null
          role: string
          specialty?: string | null
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          appointment_types?: string[] | null
          avatar_url?: string | null
          commission_pct?: number | null
          cpf?: string | null
          created_at?: string | null
          crm?: string | null
          full_name?: string
          id?: string
          letterhead_margin_bottom_mm?: number
          letterhead_margin_left_mm?: number
          letterhead_margin_right_mm?: number
          letterhead_margin_top_mm?: number
          letterhead_path?: string | null
          phone?: string | null
          role?: string
          specialty?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          active: boolean | null
          color: string | null
          description: string | null
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          description?: string | null
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          color?: string | null
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          default_price: number
          description: string | null
          duration_minutes: number | null
          id: string
          name: string
          professional_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          default_price?: number
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name: string
          professional_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          default_price?: number
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name?: string
          professional_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          id: string
          key: string
          tenant_id: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          tenant_id?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          tenant_id?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          active: boolean | null
          address: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string
          trade_name: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          trade_name?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          trade_name?: string | null
          slug?: string
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
