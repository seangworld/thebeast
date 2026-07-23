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

export type AgentConversationRow = {
  id: string
  owner_id: string
  agent_id: string
  title: string
  pinned: boolean
  archived: boolean
  tags: string[]
  summary: unknown
  related_insight_ids: string[]
  related_action_ids: string[]
  message_count: number
  created_at: string
  updated_at: string
}

export type AgentConversationMessageRow = {
  id: string
  owner_id: string
  conversation_id: string
  sender: unknown
  recipient: unknown
  content: unknown
  created_at: string
}

export type AgentMemoryRow = {
  id: string
  owner_id: string
  agent_id: string
  scope: string
  memory_key: string
  value: unknown
  purpose: string
  evidence: unknown
  source_conversation_id?: string | null
  source_message_id?: string | null
  expires_at?: string | null
  created_at: string
  updated_at: string
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

export type BeastGoalMilestoneStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Skipped"

export type BeastGoalMilestone = {
    id: string
    owner_id: string
    goal_id: string
    title: string
    status: BeastGoalMilestoneStatus
    target_date?: string | null
    completed_at?: string | null
    sort_order: number
    created_at: string
    updated_at: string
  }

export type BeastGoalSupportItemType =
  | "Dependency"
  | "Prerequisite"
  | "Blocker"
  | "Recurring Action"

export type BeastGoalSupportItemStatus =
  | "Needed"
  | "In Progress"
  | "Satisfied"
  | "Blocked"
  | "Open"
  | "Resolved"
  | "Active"
  | "Paused"

export type BeastGoalSupportItemCadence =
  | "Daily"
  | "Weekly"
  | "Biweekly"
  | "Monthly"
  | "Custom"

export type BeastGoalSupportItem = {
    id: string
    owner_id: string
    goal_id: string
    item_type: BeastGoalSupportItemType
    title: string
    status: BeastGoalSupportItemStatus
    summary?: string | null
    cadence?: BeastGoalSupportItemCadence | null
    next_due_date?: string | null
    resolved_at?: string | null
    sort_order: number
    created_at: string
    updated_at: string
  }

export type BeastGoalReferenceType =
  | "Note"
  | "Document"
  | "Event"
  | "Module Record"
  | "Today"
  | "Calendar"

export type BeastGoalReferenceStatus = "Active" | "Archived"

export type BeastGoalReference = {
    id: string
    owner_id: string
    goal_id: string
    reference_type: BeastGoalReferenceType
    title: string
    status: BeastGoalReferenceStatus
    summary?: string | null
    url?: string | null
    reference_id?: string | null
    reference_date?: string | null
    source_module?: string | null
    created_at: string
    updated_at: string
  }

export type BeastGoalContributionType =
  | "Progress"
  | "Recommendation"
  | "Milestone"
  | "Evidence"
  | "Review"

export type BeastGoalContributionStatus = "Active" | "Dismissed" | "Archived"

export type BeastGoalContribution = {
    id: string
    owner_id: string
    goal_id: string
    source_module: string
    contribution_type: BeastGoalContributionType
    status: BeastGoalContributionStatus
    title: string
    summary: string
    action_url?: string | null
    occurred_at: string
    created_at: string
    updated_at: string
  }

export type BeastGoalRecommendationType =
  | "Next Action"
  | "Review"
  | "Milestone"
  | "Risk"
  | "Opportunity"

export type BeastGoalRecommendationStatus =
  | "Suggested"
  | "Accepted"
  | "Dismissed"
  | "Completed"
  | "Archived"

export type BeastGoalRecommendation = {
    id: string
    owner_id: string
    goal_id: string
    source_module?: string | null
    recommendation_type: BeastGoalRecommendationType
    status: BeastGoalRecommendationStatus
    title: string
    reason: string
    action_label?: string | null
    action_url?: string | null
    review_due_date?: string | null
    dismissed_at?: string | null
    created_at: string
    updated_at: string
  }

export type BeastGoalLifecycleEventType =
  | "Completed"
  | "Abandoned"
  | "Revised"
  | "Archived"
  | "Superseded"

export type BeastGoalLifecycleEvent = {
    id: string
    owner_id: string
    goal_id: string
    event_type: BeastGoalLifecycleEventType
    title: string
    reason?: string | null
    previous_status?: BeastGoalStatus | null
    next_status?: BeastGoalStatus | null
    superseded_by_goal_id?: string | null
    source_module?: string | null
    occurred_at: string
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
    description?: string | null
    category: BeastDocumentCategory
    status: BeastDocumentStatus
    storage_bucket: string
    storage_path: string
    file_name: string
    mime_type: string
    size_bytes: number
    checksum?: string | null
    tags?: string[] | null
    folder_id?: string | null
    metadata?: Record<string, unknown> | null
    source_module?: string | null
    created_at: string
    updated_at: string
  }

export type BeastDocumentModuleLinkStatus = "Active" | "Archived"

export type BeastDocumentFolder = {
    id: string
    owner_id: string
    parent_folder_id?: string | null
    name: string
    description?: string | null
    sort_order: number
    created_at: string
    updated_at: string
  }

export type BeastDocumentCollectionStatus = "Active" | "Archived"

export type BeastDocumentCollection = {
    id: string
    owner_id: string
    name: string
    description?: string | null
    status: BeastDocumentCollectionStatus
    sort_order: number
    created_at: string
    updated_at: string
  }

export type BeastDocumentCollectionItemStatus = "Active" | "Archived"

export type BeastDocumentCollectionItem = {
    id: string
    owner_id: string
    collection_id: string
    document_id: string
    status: BeastDocumentCollectionItemStatus
    sort_order: number
    created_at: string
    updated_at: string
  }

export type BeastDocumentAccessPermission = "None" | "View" | "Manage"

export type BeastDocumentAccessScope = "Member" | "Household"

export type BeastDocumentAccessStatus = "Active" | "Revoked"

export type BeastDocumentCalendarLinkStatus = "Active" | "Archived"

export type BeastDocumentAccessGrant = {
  id: string
  owner_id: string
  document_id: string
    scope: BeastDocumentAccessScope
    permission: BeastDocumentAccessPermission
    status: BeastDocumentAccessStatus
    grantee_user_id?: string | null
    household_id?: string | null
    family_member_id?: string | null
    note?: string | null
    created_at: string
    updated_at: string
  revoked_at?: string | null
}

export type BeastDocumentCalendarLink = {
  id: string
  owner_id: string
  document_id: string
  calendar_item_id?: string | null
  title: string
  summary?: string | null
  status: BeastDocumentCalendarLinkStatus
  reference_date: string
  start_time?: string | null
  end_time?: string | null
  source_module?: string | null
  created_at: string
  updated_at: string
}

export type BeastDocumentModuleLink = {
    id: string
    owner_id: string
    document_id: string
    source_module: string
    module_record_id?: string | null
    title: string
    summary?: string | null
    status: BeastDocumentModuleLinkStatus
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
    payment_account_id?: string | null
    funding_account_type?: "account" | "income_pot" | null
    funding_account_id?: string | null
    funding_strategy_id?: string | null
    assigned_income_date?: string | null
    created_at?: string
  }
