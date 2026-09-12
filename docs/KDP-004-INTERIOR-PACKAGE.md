# KDP-004 Interior Package Builder

This increment builds a downloadable owner-review ZIP from approved chapters. Kindle selections produce a reflowable EPUB. Paperback or hardcover selections produce an editable DOCX master and a validated 6 × 9-inch no-bleed PDF interior. The package also contains a versioned manifest with SHA-256 file hashes, source notes and an owner handoff README.

The builder validates the internal EPUB and DOCX ZIP structures, expected chapter count, PDF signature and PDF page count before recording interior evidence. It refuses incomplete or unapproved manuscripts and runs only through the authenticated owner route.

The generated package is not publication authority. Cover, metadata, pricing, originality, rights, factual review, AI disclosure, ISBN decisions, Amazon sign-in and final submission remain separate gates. The print default follows Amazon KDP's current common 6 × 9-inch trim guidance with no bleed and margins above the minimum for short books; a future trim-control increment must revalidate official specifications before producing other layouts.
