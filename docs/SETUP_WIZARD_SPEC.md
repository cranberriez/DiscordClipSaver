# Setup Wizard Specification

## Overview

The Setup Wizard guides new users through initial configuration of Discord Clip Saver. It should be:
- **Simple**: 4-5 steps maximum
- **Skippable**: Advanced users can skip to manual setup
- **Repeatable**: Can be re-run from settings
- **Persistent**: Saves progress if user navigates away

---

## User Stories

### Story 1: New User
```
As a new user,
I want a guided setup process,
So that I can start scanning clips without reading documentation.
```

### Story 2: Returning User
```
As a returning user who added a new guild,
I want to run the wizard for just that guild,
So that I can quickly configure it.
```

### Story 3: Advanced User
```
As an advanced user,
I want to skip the wizard,
So that I can configure settings manually.
```

---

## Wizard Flow

### Entry Points

1. **First Login** (no guilds configured)
   - Automatic redirect to wizard
   - Full wizard flow

2. **New Guild Added** (has existing guilds)
   - Optional prompt: "Configure this guild with wizard?"
   - Guild-specific wizard

3. **Settings Page** (manual trigger)
   - Button: "Run Setup Wizard"
   - Can choose which guild to configure

---

## Step-by-Step Breakdown

### Step 0: Welcome Screen

**Purpose**: Introduce the wizard and set expectations

```tsx
<WizardStep step={0}>
  <div className="text-center">
    <h1>Welcome to Discord Clip Saver! 🎬</h1>
    <p>Let's get you set up in just a few steps.</p>
    
    <div className="features">
      <Feature icon="🔍">Automatically scan Discord channels</Feature>
      <Feature icon="💾">Save video clips to your library</Feature>
      <Feature icon="📊">Track and organize your clips</Feature>
    </div>
    
    <p className="time-estimate">⏱️ Takes about 2 minutes</p>
    
    <div className="actions">
      <Button onClick={startWizard}>Get Started</Button>
      <Button variant="ghost" onClick={skipWizard}>
        Skip Setup (Advanced)
      </Button>
    </div>
  </div>
</WizardStep>
```

**Actions**:
- Get Started → Step 1
- Skip Setup → Dashboard with default settings

---

### Step 1: Select Guild

**Purpose**: Choose which Discord server to configure

```tsx
<WizardStep step={1} title="Select Your Server">
  <p>Which Discord server do you want to scan for clips?</p>
  
  <GuildList>
    {guilds.map(guild => (
      <GuildCard
        key={guild.id}
        guild={guild}
        selected={selectedGuild === guild.id}
        onClick={() => selectGuild(guild.id)}
      >
        <GuildIcon src={guild.icon_url} />
        <GuildName>{guild.name}</GuildName>
        <GuildMeta>{guild.channel_count} channels</GuildMeta>
      </GuildCard>
    ))}
  </GuildList>
  
  {guilds.length === 0 && (
    <EmptyState>
      <p>No servers found. Make sure the bot is added to your server.</p>
      <Button href="/invite">Add Bot to Server</Button>
    </EmptyState>
  )}
  
  <WizardNav>
    <Button variant="ghost" onClick={goBack}>← Back</Button>
    <Button onClick={goNext} disabled={!selectedGuild}>
      Continue →
    </Button>
  </WizardNav>
</WizardStep>
```

**Validation**:
- Must select a guild
- Guild must have at least one channel

**Data Saved**:
```typescript
{
  guildId: string;
}
```

---

### Step 2: Select Channels

**Purpose**: Choose which channels to scan

```tsx
<WizardStep step={2} title="Choose Channels to Scan">
  <p>Select the channels where you want to find video clips.</p>
  
  <ChannelSelector>
    <QuickActions>
      <Button size="sm" onClick={selectAll}>Select All</Button>
      <Button size="sm" onClick={selectNone}>Select None</Button>
      <Button size="sm" onClick={selectRecommended}>
        Recommended Only
      </Button>
    </QuickActions>
    
    <ChannelList>
      {channels.map(channel => (
        <ChannelItem key={channel.id}>
          <Checkbox
            checked={selectedChannels.includes(channel.id)}
            onChange={() => toggleChannel(channel.id)}
          />
          <ChannelIcon type={channel.type} />
          <ChannelName>#{channel.name}</ChannelName>
          {channel.recommended && <Badge>Recommended</Badge>}
          {channel.nsfw && <Badge variant="warning">NSFW</Badge>}
        </ChannelItem>
      ))}
    </ChannelList>
    
    <SelectedCount>
      {selectedChannels.length} of {channels.length} channels selected
    </SelectedCount>
  </ChannelSelector>
  
  <InfoBox>
    💡 Tip: Start with a few channels and add more later.
  </InfoBox>
  
  <WizardNav>
    <Button variant="ghost" onClick={goBack}>← Back</Button>
    <Button onClick={goNext} disabled={selectedChannels.length === 0}>
      Continue →
    </Button>
  </WizardNav>
</WizardStep>
```

**Recommended Channels Logic**:
- Text channels (not voice/category)
- Not NSFW (unless user opts in)
- Active in last 30 days
- Common names: #general, #clips, #videos, #gaming

**Validation**:
- Must select at least one channel

**Data Saved**:
```typescript
{
  channelIds: string[];
}
```

---

### Step 3: Basic Configuration

**Purpose**: Set essential scanning preferences

```tsx
<WizardStep step={3} title="Configure Scanning">
  <SettingsForm>
    <FormSection>
      <Label>Your Timezone</Label>
      <Select
        value={timezone}
        onChange={setTimezone}
        options={commonTimezones}
      />
      <HelpText>
        Used for scheduling and timestamps. Current time: {currentTime}
      </HelpText>
    </FormSection>
    
    <FormSection>
      <Label>Minimum Video Length</Label>
      <NumberInput
        value={minVideoSeconds}
        onChange={setMinVideoSeconds}
        min={0}
        max={60}
        suffix="seconds"
      />
      <HelpText>
        Ignore videos shorter than this. Set to 0 for no minimum.
      </HelpText>
    </FormSection>
    
    <FormSection>
      <Label>Scan Mode</Label>
      <RadioGroup value={scanMode} onChange={setScanMode}>
        <Radio value="forward">
          <RadioLabel>Forward Scan (Recommended)</RadioLabel>
          <RadioDescription>
            Scan new messages as they arrive. Best for ongoing monitoring.
          </RadioDescription>
        </Radio>
        <Radio value="backfill">
          <RadioLabel>Backfill Scan</RadioLabel>
          <RadioDescription>
            Scan older messages first. Good for finding historical clips.
          </RadioDescription>
        </Radio>
      </RadioGroup>
    </FormSection>
    
    <FormSection>
      <Label>
        <Checkbox
          checked={parseThreads}
          onChange={setParseThreads}
        />
        Include thread messages
      </Label>
      <HelpText>
        Also scan messages in threads and forum posts.
      </HelpText>
    </FormSection>
  </SettingsForm>
  
  <WizardNav>
    <Button variant="ghost" onClick={goBack}>← Back</Button>
    <Button onClick={goNext}>Continue →</Button>
  </WizardNav>
</WizardStep>
```

**Default Values**:
```typescript
{
  timezone: "UTC", // Or detect from browser
  minVideoSeconds: 0,
  scanMode: "forward",
  parseThreads: false,
}
```

**Data Saved**:
```typescript
{
  settings: {
    tz: string;
    parse_threads: boolean;
  },
  defaultChannelSettings: {
    scan_mode: "forward" | "backfill";
    min_video_seconds: number;
  }
}
```

---

### Step 4: Review & Confirm

**Purpose**: Show summary and confirm settings

```tsx
<WizardStep step={4} title="Review Your Settings">
  <Summary>
    <SummarySection>
      <SectionTitle>Server</SectionTitle>
      <SummaryItem>
        <GuildIcon src={selectedGuild.icon_url} />
        {selectedGuild.name}
      </SummaryItem>
    </SummarySection>
    
    <SummarySection>
      <SectionTitle>Channels ({selectedChannels.length})</SectionTitle>
      <ChannelChips>
        {selectedChannels.map(channel => (
          <Chip key={channel.id}>#{channel.name}</Chip>
        ))}
      </ChannelChips>
    </SummarySection>
    
    <SummarySection>
      <SectionTitle>Settings</SectionTitle>
      <SummaryList>
        <SummaryItem>
          <ItemLabel>Timezone:</ItemLabel>
          <ItemValue>{settings.tz}</ItemValue>
        </SummaryItem>
        <SummaryItem>
          <ItemLabel>Min Video Length:</ItemLabel>
          <ItemValue>{settings.minVideoSeconds}s</ItemValue>
        </SummaryItem>
        <SummaryItem>
          <ItemLabel>Scan Mode:</ItemLabel>
          <ItemValue>{settings.scanMode}</ItemValue>
        </SummaryItem>
        <SummaryItem>
          <ItemLabel>Include Threads:</ItemLabel>
          <ItemValue>{settings.parseThreads ? "Yes" : "No"}</ItemValue>
        </SummaryItem>
      </SummaryList>
    </SummarySection>
  </Summary>
  
  <ActionPrompt>
    <Checkbox
      checked={startScanNow}
      onChange={setStartScanNow}
    />
    <Label>Start scanning immediately after setup</Label>
  </ActionPrompt>
  
  <WizardNav>
    <Button variant="ghost" onClick={goBack}>← Back</Button>
    <Button onClick={finishSetup} loading={saving}>
      {startScanNow ? "Start Scanning" : "Complete Setup"}
    </Button>
  </WizardNav>
</WizardStep>
```

**Actions on Finish**:
1. Save guild settings
2. Enable selected channels
3. Enable guild scanning (if startScanNow)
4. Redirect to dashboard
5. Show success notification

---

### Step 5: Success Screen

**Purpose**: Confirm completion and guide next steps

```tsx
<WizardStep step={5} title="Setup Complete!">
  <SuccessAnimation>
    <CheckmarkIcon />
  </SuccessAnimation>
  
  <SuccessMessage>
    <h2>You're all set! 🎉</h2>
    <p>
      {startScanNow
        ? "We're now scanning your selected channels for video clips."
        : "Your server is configured and ready to scan."}
    </p>
  </SuccessMessage>
  
  <NextSteps>
    <h3>What's Next?</h3>
    <StepList>
      <Step>
        <StepIcon>📊</StepIcon>
        <StepContent>
          <StepTitle>Monitor Progress</StepTitle>
          <StepDescription>
            Check the Overview tab to see scan progress
          </StepDescription>
        </StepContent>
      </Step>
      <Step>
        <StepIcon>⚙️</StepIcon>
        <StepContent>
          <StepTitle>Adjust Settings</StepTitle>
          <StepDescription>
            Fine-tune your configuration in the Settings tab
          </StepDescription>
        </StepContent>
      </Step>
      <Step>
        <StepIcon>🎬</StepIcon>
        <StepContent>
          <StepTitle>View Clips</StepTitle>
          <StepDescription>
            Found clips will appear in your library (coming soon!)
          </StepDescription>
        </StepContent>
      </Step>
    </StepList>
  </NextSteps>
  
  <Actions>
    <Button onClick={goToDashboard}>Go to Dashboard</Button>
    <Button variant="ghost" onClick={runWizardAgain}>
      Configure Another Server
    </Button>
  </Actions>
</WizardStep>
```

---

## Technical Implementation

### State Management

```typescript
interface WizardState {
  currentStep: number;
  completed: boolean;
  data: {
    guildId?: string;
    channelIds?: string[];
    settings?: Partial<GuildSettings>;
    defaultChannelSettings?: Partial<DefaultChannelSettings>;
    startScanNow?: boolean;
  };
}

// Store in localStorage for persistence
const WIZARD_STORAGE_KEY = "discord-clip-saver:wizard-state";

function saveWizardState(state: WizardState) {
  localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
}

function loadWizardState(): WizardState | null {
  const stored = localStorage.getItem(WIZARD_STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

function clearWizardState() {
  localStorage.removeItem(WIZARD_STORAGE_KEY);
}
```

### Component Structure

```
components/
├── SetupWizard/
│   ├── SetupWizard.tsx          # Main wizard container
│   ├── WizardStep.tsx           # Generic step wrapper
│   ├── WizardNav.tsx            # Navigation buttons
│   ├── WizardProgress.tsx       # Progress indicator
│   ├── steps/
│   │   ├── WelcomeStep.tsx
│   │   ├── SelectGuildStep.tsx
│   │   ├── SelectChannelsStep.tsx
│   │   ├── ConfigureStep.tsx
│   │   ├── ReviewStep.tsx
│   │   └── SuccessStep.tsx
│   └── hooks/
│       ├── useWizardState.ts
│       └── useWizardNavigation.ts
```

### API Integration

```typescript
// Save wizard configuration
async function completeWizardSetup(data: WizardState["data"]) {
  // 1. Update guild settings
  await fetch(`/api/guilds/${data.guildId}/settings`, {
    method: "PUT",
    body: JSON.stringify({
      settings: data.settings,
      defaultChannelSettings: data.defaultChannelSettings,
    }),
  });

  // 2. Enable selected channels
  await fetch(`/api/guilds/${data.guildId}/channels/bulk`, {
    method: "POST",
    body: JSON.stringify({
      channelIds: data.channelIds,
      enabled: true,
    }),
  });

  // 3. Enable guild scanning if requested
  if (data.startScanNow) {
    await fetch(`/api/guilds/${data.guildId}/toggle`, {
      method: "POST",
      body: JSON.stringify({ enabled: true }),
    });
  }
}
```

---

## UI/UX Guidelines

### Visual Design

- **Progress Indicator**: Show current step (e.g., "Step 2 of 4")
- **Step Transitions**: Smooth animations between steps
- **Loading States**: Show spinners during API calls
- **Error Handling**: Clear error messages with retry options
- **Mobile Responsive**: Works on all screen sizes

### Accessibility

- **Keyboard Navigation**: Tab through all interactive elements
- **Screen Reader Support**: Proper ARIA labels
- **Focus Management**: Auto-focus on step change
- **Color Contrast**: WCAG AA compliant

### Copy Guidelines

- **Tone**: Friendly and encouraging
- **Length**: Keep text concise
- **Instructions**: Clear and actionable
- **Help Text**: Provide context without overwhelming

---

## Edge Cases

### No Guilds Available
```
User has no guilds → Show "Add Bot" prompt
```

### No Channels in Guild
```
Guild has no channels → Show error, allow going back
```

### API Errors
```
Save fails → Show error, allow retry without losing data
```

### User Navigates Away
```
User leaves wizard → Save state, show "Resume Setup" on return
```

### Multiple Guilds Already Configured
```
User has existing guilds → Skip to guild selection, mark as "Add Another"
```

---

## Testing Checklist

### Functional Tests
- [ ] Complete wizard with valid data
- [ ] Navigate back and forth between steps
- [ ] Skip wizard and verify defaults
- [ ] Resume wizard after navigation
- [ ] Handle API errors gracefully
- [ ] Verify data persistence

### User Experience Tests
- [ ] First-time user flow
- [ ] Returning user flow
- [ ] Mobile responsiveness
- [ ] Keyboard navigation
- [ ] Screen reader compatibility

### Edge Case Tests
- [ ] No guilds available
- [ ] No channels in guild
- [ ] Network errors
- [ ] Browser refresh during wizard
- [ ] Multiple concurrent wizards

---

## Future Enhancements

### Phase 2
- **Smart Recommendations**: ML-based channel suggestions
- **Bulk Configuration**: Configure multiple guilds at once
- **Templates**: Save wizard configurations as templates
- **Video Tutorial**: Embedded video walkthrough

### Phase 3
- **Interactive Tour**: Highlight features after wizard
- **A/B Testing**: Test different wizard flows
- **Analytics**: Track completion rates and drop-off points
- **Personalization**: Adapt wizard based on user behavior

---

## Metrics to Track

- **Completion Rate**: % of users who finish wizard
- **Drop-off Points**: Which steps lose users
- **Time to Complete**: Average time spent in wizard
- **Skip Rate**: % of users who skip wizard
- **Return Rate**: % of users who re-run wizard

---

**Last Updated**: January 14, 2025
**Status**: Specification Complete - Ready for Implementation
