# Licensing & Commercial Strategy

## Overview

Discord Clip Saver will have two versions:
1. **Open Source** - Self-hosted, free for non-commercial use
2. **Commercial SaaS** - Hosted service with free and paid tiers

---

## Open Source Version

### License: AGPL-3.0 with Commons Clause

```
Discord Clip Saver - Open Source Edition
Copyright (C) 2025 [Your Name/Company]

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Additional Terms (Commons Clause):
The Software is provided to you by the Licensor under the License,
as defined below, subject to the following condition.

Without limiting other conditions in the License, the grant of rights
under the License will not include, and the License does not grant to
you, the right to Sell the Software.

For purposes of the foregoing, "Sell" means practicing any or all of
the rights granted to you under the License to provide to third parties,
for a fee or other consideration (including without limitation fees for
hosting or consulting/support services related to the Software), a
product or service whose value derives, entirely or substantially, from
the functionality of the Software.
```

### What This Means

**✅ Allowed:**
- Self-hosting for personal use
- Self-hosting for your organization/company
- Contributing code improvements
- Forking for personal modifications
- Using for educational purposes
- Deploying internally within your company

**❌ Not Allowed:**
- Selling hosted instances
- Offering as a paid service
- Selling support/consulting as primary business
- Rebranding and selling
- Creating competing commercial products

### Target Audience

- **Developers** - Learn, contribute, customize
- **Power Users** - Self-host with full control
- **Organizations** - Internal deployment
- **Contributors** - Build features, fix bugs

---

## Commercial SaaS Version

### Pricing Tiers

#### Free Tier
```
$0/month

✓ 1 Discord server
✓ Up to 10 channels
✓ 100 clips/month
✓ 1 GB storage
✓ 7-day clip retention
✓ Community support
```

#### Hobbyist Tier
```
$9/month

✓ 3 Discord servers
✓ Unlimited channels
✓ 1,000 clips/month
✓ 10 GB storage
✓ 30-day clip retention
✓ Email support
✓ Advanced analytics
```

#### Pro Tier
```
$29/month

✓ 10 Discord servers
✓ Unlimited channels
✓ 10,000 clips/month
✓ 100 GB storage
✓ 90-day clip retention
✓ Priority support
✓ API access
✓ Webhooks
✓ Custom branding
```

#### Enterprise Tier
```
Custom Pricing

✓ Unlimited servers
✓ Unlimited channels
✓ Unlimited clips
✓ Custom storage
✓ Unlimited retention
✓ Dedicated support
✓ SLA guarantee
✓ On-premise option
✓ Custom integrations
✓ White-label option
```

### Pay-Per-Use Option

For users who don't need monthly plans:

```
Pay As You Go

$0.01 per clip processed
$0.10 per GB storage/month
No monthly commitment
```

---

## Feature Comparison

| Feature | Open Source | Free SaaS | Hobbyist | Pro | Enterprise |
|---------|-------------|-----------|----------|-----|------------|
| **Servers** | Unlimited | 1 | 3 | 10 | Unlimited |
| **Channels** | Unlimited | 10 | Unlimited | Unlimited | Unlimited |
| **Clips/Month** | Unlimited | 100 | 1,000 | 10,000 | Unlimited |
| **Storage** | Self-managed | 1 GB | 10 GB | 100 GB | Custom |
| **Retention** | Forever | 7 days | 30 days | 90 days | Custom |
| **Setup Wizard** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Scan Monitor** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Analytics** | ✓ | Basic | ✓ | ✓ | ✓ |
| **API Access** | ✓ | ✗ | ✗ | ✓ | ✓ |
| **Webhooks** | ✓ | ✗ | ✗ | ✓ | ✓ |
| **Custom Branding** | ✓ | ✗ | ✗ | ✓ | ✓ |
| **Support** | Community | Community | Email | Priority | Dedicated |
| **SLA** | ✗ | ✗ | ✗ | ✗ | ✓ |
| **Self-Hosted** | ✓ | ✗ | ✗ | ✗ | Optional |
| **White-Label** | ✓ | ✗ | ✗ | ✗ | ✓ |
| **Engineer Panel** | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## Code Organization

### Shared Codebase Strategy

```
discord-clip-saver/
├── core/                    # Shared core (MIT License)
│   ├── scanner/            # Discord scanning logic
│   ├── processor/          # Clip processing
│   ├── storage/            # Storage abstraction
│   └── utils/              # Shared utilities
│
├── open-source/            # AGPL + Commons Clause
│   ├── interface/          # Next.js frontend
│   ├── api/                # API routes
│   ├── docs/               # Documentation
│   └── docker/             # Docker configs
│
└── commercial/             # Proprietary
    ├── billing/            # Stripe integration
    ├── limits/             # Usage limits
    ├── analytics/          # Advanced analytics
    └── enterprise/         # Enterprise features
```

### Feature Flags

```typescript
// lib/features/flags.ts
export const FEATURES = {
  // Always available
  BASIC_SCANNING: true,
  SETUP_WIZARD: true,
  SCAN_MONITOR: true,
  
  // Commercial only
  API_ACCESS: process.env.TIER === "pro" || process.env.TIER === "enterprise",
  WEBHOOKS: process.env.TIER === "pro" || process.env.TIER === "enterprise",
  CUSTOM_BRANDING: process.env.TIER === "pro" || process.env.TIER === "enterprise",
  ADVANCED_ANALYTICS: process.env.TIER !== "free",
  
  // Enterprise only
  WHITE_LABEL: process.env.TIER === "enterprise",
  SLA: process.env.TIER === "enterprise",
  
  // Open source only
  ENGINEER_PANEL: process.env.IS_SELF_HOSTED === "true",
};

// Usage
if (FEATURES.API_ACCESS) {
  // Show API documentation
}
```

---

## Migration Path

### Self-Hosted → SaaS

Make it easy for users to migrate:

```
1. Export data from self-hosted
   - Download all clips
   - Export settings JSON
   - Export scan history

2. Import to SaaS
   - Upload settings
   - Bulk upload clips (if within limits)
   - Preserve metadata

3. Gradual transition
   - Run both in parallel
   - Verify data integrity
   - Switch over when ready
```

### Free → Paid Tier

Seamless upgrade flow:

```
1. User hits limit
   - Show upgrade prompt
   - Explain benefits
   - Offer trial period

2. Choose plan
   - Compare features
   - Calculate savings
   - Enter payment info

3. Instant upgrade
   - No data migration
   - Features unlock immediately
   - Prorated billing
```

---

## Revenue Model

### Year 1 Goals

```
Target: $10,000 MRR (Monthly Recurring Revenue)

Breakdown:
- 100 Hobbyist users × $9 = $900
- 200 Pro users × $29 = $5,800
- 10 Enterprise users × $300 = $3,000
- Pay-per-use: ~$300

Total: $10,000/month
```

### Growth Strategy

**Phase 1: Launch (Months 1-3)**
- Release open source version
- Build community
- Gather feedback
- Fix bugs

**Phase 2: SaaS Beta (Months 4-6)**
- Launch free tier
- Invite beta testers
- Refine pricing
- Add payment processing

**Phase 3: Public Launch (Months 7-9)**
- Open to public
- Marketing campaign
- Content marketing
- Discord communities

**Phase 4: Scale (Months 10-12)**
- Enterprise features
- Partnerships
- Integrations
- International expansion

---

## Legal Considerations

### Terms of Service

Key points to include:

1. **Usage Limits**
   - Clearly define tier limits
   - Overage policies
   - Fair use policy

2. **Data Ownership**
   - Users own their clips
   - We store, don't claim ownership
   - Export rights

3. **Privacy**
   - GDPR compliance
   - Data retention policies
   - Third-party sharing (none)

4. **Liability**
   - Service availability
   - Data loss protection
   - Discord TOS compliance

### Privacy Policy

1. **Data Collection**
   - Discord user IDs (for auth)
   - Clip metadata
   - Usage analytics

2. **Data Storage**
   - Encrypted at rest
   - Secure transmission
   - Regular backups

3. **Data Deletion**
   - User can delete anytime
   - 30-day retention after deletion
   - Complete removal guarantee

---

## Open Source Contribution

### Contributor License Agreement (CLA)

```
By contributing to Discord Clip Saver, you agree that:

1. You grant us a perpetual, worldwide, non-exclusive, royalty-free
   license to use, modify, and distribute your contributions.

2. Your contributions are your original work.

3. You have the right to grant this license.

4. We may use your contributions in both open source and commercial
   versions of the software.
```

### Contribution Guidelines

**What We Accept:**
- Bug fixes
- Performance improvements
- New features (after discussion)
- Documentation improvements
- Test coverage
- UI/UX enhancements

**What We Don't Accept:**
- Commercial-only features
- Breaking changes without discussion
- Code without tests
- Poorly documented code

### Recognition

- Contributors listed in README
- Changelog credits
- Special Discord role
- Swag for significant contributions
- Potential job opportunities

---

## Support Model

### Community Support (Free)

- GitHub Discussions
- Discord server
- Documentation
- FAQ/Wiki

### Email Support (Paid Tiers)

- Response within 24 hours
- Troubleshooting help
- Feature requests
- Bug reports

### Priority Support (Pro+)

- Response within 4 hours
- Direct Slack/Discord channel
- Video calls if needed
- Dedicated account manager (Enterprise)

---

## Marketing Strategy

### Open Source Marketing

1. **GitHub**
   - Detailed README
   - Comprehensive docs
   - Issue templates
   - Contributing guide

2. **Content**
   - Blog posts
   - Video tutorials
   - Case studies
   - Comparison articles

3. **Community**
   - Discord server
   - Reddit posts
   - Hacker News
   - Product Hunt

### SaaS Marketing

1. **SEO**
   - Landing pages
   - Blog content
   - Documentation
   - Comparison pages

2. **Paid Ads**
   - Google Ads
   - Reddit Ads
   - Discord Ads
   - YouTube Ads

3. **Partnerships**
   - Discord bot lists
   - Gaming communities
   - Content creators
   - Streamers

---

## Competitive Advantages

### vs. Self-Hosted Solutions

**SaaS Benefits:**
- No setup required
- Automatic updates
- Managed infrastructure
- Better uptime
- Professional support

### vs. Other SaaS Tools

**Our Advantages:**
- Open source option
- Better pricing
- More features
- Discord-focused
- Active development

---

## Exit Strategy

### Potential Outcomes

1. **Bootstrap to Profitability**
   - Sustainable revenue
   - No outside funding
   - Full control

2. **Acquisition**
   - Discord (unlikely but ideal)
   - Gaming platform
   - Media management company
   - Larger SaaS company

3. **Venture Funding**
   - Scale faster
   - Hire team
   - Expand features
   - International growth

---

## Timeline

### 2025 Q1-Q2: Foundation
- ✓ Core features complete
- ✓ Open source release
- ✓ Documentation
- ✓ Community building

### 2025 Q3: SaaS Beta
- Payment integration
- Usage limits
- Billing system
- Beta testing

### 2025 Q4: Public Launch
- Marketing campaign
- Public availability
- First paying customers
- Iterate based on feedback

### 2026 Q1: Growth
- Enterprise features
- API improvements
- Integrations
- Scale infrastructure

---

## Key Metrics to Track

### Open Source
- GitHub stars
- Contributors
- Issues/PRs
- Downloads
- Community size

### SaaS
- MRR (Monthly Recurring Revenue)
- Churn rate
- Customer acquisition cost
- Lifetime value
- Conversion rate (free → paid)

---

**Last Updated**: January 14, 2025
**Status**: Strategy Complete - Ready for Execution
