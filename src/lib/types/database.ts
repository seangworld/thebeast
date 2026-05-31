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
    created_at?: string
  }