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
export type SubscriptionStatus =
  | "active"
  | "trial"
  | "canceled"
  | "past_due"
  | "incomplete"
export type BillingProvider = "stripe"

export type Profile = {
    id: string
    role: UserRole
    membership_plan?: MembershipPlan | null
    onboarding_complete: boolean
    stripe_customer_id?: string | null
    preferred_name?: string | null
    display_name?: string | null
    full_name?: string | null
    username?: string | null
    birthday?: string | null
    location?: string | null
    timezone?: string | null
    household_context?: string | null
    bio?: string | null
    current_academic_level?: string | null
    career_interests?: string | null
    learning_preferences?: string | null
    learning_availability?: string | null
    learning_strengths?: string | null
    learning_help_areas?: string | null
    created_at: string
    updated_at: string
  }

export type BeastGoalStatus =
  | "Proposed"
  | "Active"
  | "Paused"
  | "Blocked"
  | "Completed"
  | "Archived"

export type BeastGoalCategory =
  | "Education"
  | "Career"
  | "Money"
  | "Personal"
  | "Project"
  | "Home"
  | "Health"
  | "Other"

export type BeastGoal = {
    id: string
    owner_id: string
    title: string
    category: BeastGoalCategory
    status: BeastGoalStatus
    summary?: string | null
    target_date?: string | null
    current_step?: string | null
    source_module?: string | null
    created_at: string
    updated_at: string
  }

export type BeastDocumentStatus = "Uploaded" | "Ready" | "Archived" | "Deleted"

export type BeastDocumentCategory =
  | "Money"
  | "Learning"
  | "Identity"
  | "Household"
  | "Tax"
  | "Legal"
  | "Health"
  | "Home"
  | "Vehicle"
  | "Other"

export type BeastDocument = {
    id: string
    owner_id: string
    title: string
    category: BeastDocumentCategory
    status: BeastDocumentStatus
    storage_bucket: string
    storage_path: string
    file_name: string
    mime_type: string
    size_bytes: number
    checksum?: string | null
    source_module?: string | null
    created_at: string
    updated_at: string
  }

export type Subscription = {
    id: string
    user_id: string
    plan: MembershipPlan
    status: SubscriptionStatus
    billing_provider: BillingProvider
    provider_customer_id?: string | null
    provider_subscription_id?: string | null
    current_period_end?: string | null
    cancel_at_period_end: boolean
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
