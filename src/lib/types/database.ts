export type FundingSource = {
    id: string
    user_id: string
  
    name: string
    type: string
  
    current_balance: number
  
    credit_limit?: number | null
    available_credit?: number | null
  
    interest_rate?: number | null
  
    is_active: boolean
    
    linked_debt_id?: string | null
  
    created_at: string
  }

export type UserRole = "user" | "admin"

export type Profile = {
    id: string
    role: UserRole
    onboarding_complete: boolean
    stripe_customer_id?: string | null
    created_at: string
    updated_at: string
  }

export type Debt = {
    id: string
    user_id: string
    name: string
    balance: number
    minimum_payment: number
    interest_rate: number
    due_date?: number | null
    is_archived?: boolean | null
    payment_behavior?: "fixed" | "revolving"
    minimum_payment_rate?: number | null
    minimum_payment_floor?: number | null
    next_due_date_after_payment?: string | null
    funding_source_id?: string | null
    assigned_income_date?: string | null
    created_at?: string
  }
