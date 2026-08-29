export type BankConnectionType = 'demo' | 'sandbox' | 'live'

export type BankConnectionStatus = 'disconnected' | 'connected' | 'syncing' | 'error'

export type BankTransactionDirection = 'inflow' | 'outflow'

export type BankTransactionCategory =
  | 'sales_deposit'
  | 'customer_payment'
  | 'supplier_payment'
  | 'reserve_transfer'
  | 'fee'
  | 'other'

export type BankTransactionSource = 'demo' | 'sandbox' | 'bank_sync'

export type BankActionType =
  | 'deposit_sales'
  | 'collect_customer_payment'
  | 'pay_supplier'
  | 'move_to_reserve'
  | 'request_bank_support'

export type BankActionStatus = 'draft' | 'confirmed' | 'completed' | 'failed'

export type BankSupportRequestType =
  | 'business_account'
  | 'merchant_qr'
  | 'payment_service'
  | 'working_capital'
  | 'financial_guidance'

export type BankSupportRequestStatus = 'draft' | 'submitted' | 'contacted' | 'closed'

export interface BankDatabase {
  public: {
    Tables: {
      bank_connections: {
        Row: {
          id: string
          owner_id: string
          business_id: string
          provider_name: string
          connection_type: BankConnectionType
          status: BankConnectionStatus
          account_mask: string | null
          consent_given: boolean
          consent_at: string | null
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          business_id: string
          provider_name: string
          connection_type?: BankConnectionType
          status?: BankConnectionStatus
          account_mask?: string | null
          consent_given?: boolean
          consent_at?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          business_id?: string
          provider_name?: string
          connection_type?: BankConnectionType
          status?: BankConnectionStatus
          account_mask?: string | null
          consent_given?: boolean
          consent_at?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bank_connections_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bank_connections_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          },
        ]
      }
      bank_transactions: {
        Row: {
          id: string
          owner_id: string
          business_id: string
          bank_connection_id: string
          external_transaction_id: string
          direction: BankTransactionDirection
          amount: number
          transaction_date: string
          category: BankTransactionCategory
          description: string | null
          source: BankTransactionSource
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          business_id: string
          bank_connection_id: string
          external_transaction_id: string
          direction: BankTransactionDirection
          amount: number
          transaction_date: string
          category: BankTransactionCategory
          description?: string | null
          source: BankTransactionSource
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          business_id?: string
          bank_connection_id?: string
          external_transaction_id?: string
          direction?: BankTransactionDirection
          amount?: number
          transaction_date?: string
          category?: BankTransactionCategory
          description?: string | null
          source?: BankTransactionSource
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bank_transactions_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bank_transactions_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bank_transactions_bank_connection_id_fkey'
            columns: ['bank_connection_id']
            isOneToOne: false
            referencedRelation: 'bank_connections'
            referencedColumns: ['id']
          },
        ]
      }
      bank_actions: {
        Row: {
          id: string
          owner_id: string
          business_id: string
          action_type: BankActionType
          amount: number | null
          status: BankActionStatus
          idempotency_key: string
          confirmed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          business_id: string
          action_type: BankActionType
          amount?: number | null
          status?: BankActionStatus
          idempotency_key?: string
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          business_id?: string
          action_type?: BankActionType
          amount?: number | null
          status?: BankActionStatus
          idempotency_key?: string
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bank_actions_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bank_actions_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          },
        ]
      }
      bank_support_requests: {
        Row: {
          id: string
          owner_id: string
          business_id: string
          request_type: BankSupportRequestType
          owner_message: string | null
          owner_consent: boolean
          status: BankSupportRequestStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          business_id: string
          request_type: BankSupportRequestType
          owner_message?: string | null
          owner_consent: boolean
          status?: BankSupportRequestStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          business_id?: string
          request_type?: BankSupportRequestType
          owner_message?: string | null
          owner_consent?: boolean
          status?: BankSupportRequestStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bank_support_requests_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bank_support_requests_business_id_fkey'
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

type BankTables = BankDatabase['public']['Tables']

export type BankConnection = BankTables['bank_connections']['Row']
export type BankConnectionInsert = BankTables['bank_connections']['Insert']
export type BankConnectionUpdate = BankTables['bank_connections']['Update']

export type BankTransaction = BankTables['bank_transactions']['Row']
export type BankTransactionInsert = BankTables['bank_transactions']['Insert']
export type BankTransactionUpdate = BankTables['bank_transactions']['Update']

export type BankAction = BankTables['bank_actions']['Row']
export type BankActionInsert = BankTables['bank_actions']['Insert']
export type BankActionUpdate = BankTables['bank_actions']['Update']

export type BankSupportRequest = BankTables['bank_support_requests']['Row']
export type BankSupportRequestInsert = BankTables['bank_support_requests']['Insert']
export type BankSupportRequestUpdate = BankTables['bank_support_requests']['Update']
