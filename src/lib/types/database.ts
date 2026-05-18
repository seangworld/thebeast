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
  
    created_at: string
  }