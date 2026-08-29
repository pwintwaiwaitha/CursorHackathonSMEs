export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type CheckInSource = 'form' | 'voice'

export type LedgerStatus = 'pending' | 'partial' | 'paid' | 'overdue'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          preferred_language: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          preferred_language?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone?: string | null
          preferred_language?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      businesses: {
        Row: {
          id: string
          owner_id: string
          name: string
          business_type: string | null
          starting_cash: number
          emergency_reserve: number
          currency: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          business_type?: string | null
          starting_cash?: number
          emergency_reserve?: number
          currency?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          business_type?: string | null
          starting_cash?: number
          emergency_reserve?: number
          currency?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'businesses_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      daily_checkins: {
        Row: {
          id: string
          owner_id: string
          business_id: string
          checkin_date: string
          opening_cash: number
          cash_sales: number
          receivables_collected: number
          other_income: number
          inventory_purchases: number
          supplier_payments: number
          wages: number
          rent_and_utilities: number
          other_expenses: number
          notes: string | null
          source: CheckInSource
          created_at: string
          updated_at: string
          closing_cash: number
        }
        Insert: {
          id?: string
          owner_id: string
          business_id: string
          checkin_date: string
          opening_cash?: number
          cash_sales?: number
          receivables_collected?: number
          other_income?: number
          inventory_purchases?: number
          supplier_payments?: number
          wages?: number
          rent_and_utilities?: number
          other_expenses?: number
          notes?: string | null
          source?: CheckInSource
          created_at?: string
          updated_at?: string
          closing_cash?: never
        }
        Update: {
          id?: string
          owner_id?: string
          business_id?: string
          checkin_date?: string
          opening_cash?: number
          cash_sales?: number
          receivables_collected?: number
          other_income?: number
          inventory_purchases?: number
          supplier_payments?: number
          wages?: number
          rent_and_utilities?: number
          other_expenses?: number
          notes?: string | null
          source?: CheckInSource
          created_at?: string
          updated_at?: string
          closing_cash?: never
        }
        Relationships: [
          {
            foreignKeyName: 'daily_checkins_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'daily_checkins_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          },
        ]
      }
      receivables: {
        Row: {
          id: string
          owner_id: string
          business_id: string
          customer_name: string
          amount: number
          due_date: string | null
          status: LedgerStatus
          amount_received: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          business_id: string
          customer_name: string
          amount: number
          due_date?: string | null
          status?: LedgerStatus
          amount_received?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          business_id?: string
          customer_name?: string
          amount?: number
          due_date?: string | null
          status?: LedgerStatus
          amount_received?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'receivables_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receivables_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          },
        ]
      }
      payables: {
        Row: {
          id: string
          owner_id: string
          business_id: string
          supplier_name: string
          category: string | null
          amount: number
          due_date: string | null
          status: LedgerStatus
          amount_paid: number
          essential: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          business_id: string
          supplier_name: string
          category?: string | null
          amount: number
          due_date?: string | null
          status?: LedgerStatus
          amount_paid?: number
          essential?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          business_id?: string
          supplier_name?: string
          category?: string | null
          amount?: number
          due_date?: string | null
          status?: LedgerStatus
          amount_paid?: number
          essential?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payables_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payables_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          },
        ]
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

type PublicTables = Database['public']['Tables']

export type Profile = PublicTables['profiles']['Row']
export type ProfileInsert = PublicTables['profiles']['Insert']
export type ProfileUpdate = PublicTables['profiles']['Update']

export type Business = PublicTables['businesses']['Row']
export type BusinessInsert = PublicTables['businesses']['Insert']
export type BusinessUpdate = PublicTables['businesses']['Update']

export type DailyCheckin = PublicTables['daily_checkins']['Row']
export type DailyCheckinInsert = PublicTables['daily_checkins']['Insert']
export type DailyCheckinUpdate = PublicTables['daily_checkins']['Update']

export type Receivable = PublicTables['receivables']['Row']
export type ReceivableInsert = PublicTables['receivables']['Insert']
export type ReceivableUpdate = PublicTables['receivables']['Update']

export type Payable = PublicTables['payables']['Row']
export type PayableInsert = PublicTables['payables']['Insert']
export type PayableUpdate = PublicTables['payables']['Update']
