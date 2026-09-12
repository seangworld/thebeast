# KDP-003 Sourced Manuscript Pipeline

This increment creates an owner-scoped chapter plan from an approved publication brief and generates sourced review drafts through the existing OpenAI provider. The owner can generate one chapter or select **Generate all remaining chapters** to process every waiting chapter sequentially with progress shown in BeastAdmin. Current web research is mandatory, returned source notes must match provider citations, and drafts shorter than 300 words or lacking attributable sources fail closed.

Every chapter retains its number, title, draft, word count, sources, limitations, provider model and review state. The owner approves chapters individually. Only after every planned chapter is approved does the publication advance to quality review with manuscript evidence recorded.

Generated prose is explicitly a review draft. Bulk generation does not bulk-approve: every chapter retains its individual approval gate. If a request fails, completed drafts remain saved and the affected chapter is blocked for a safe retry. This increment does not create a KDP-ready file, approve factual or rights claims, spend on advertising, sign in to Amazon, submit a title or publish anything. Manuscript generation uses the already-configured OpenAI provider only when the owner selects a generation action.
