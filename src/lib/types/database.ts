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

export type UserRole = "user" | "beta" | "admin"
export type MembershipPlan = "free" | "pro"

export type Profile = {
    id: string
    role: UserRole
    membership_plan?: MembershipPlan | null
    onboarding_complete: boolean
    stripe_customer_id?: string | null
    created_at: string
    updated_at: string
  }

export type VelocitySourceType = "heloc" | "ploc" | "credit_card" | "other"

export type VelocitySettings = {
    user_id: string
    velocity_source_type: VelocitySourceType
    credit_limit?: number | null
    current_balance?: number | null
    source_apr?: number | null
    max_utilization_percent: number
    recovery_months: number
    emergency_reserve_amount?: number | null
    allow_super_velocity: boolean
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
